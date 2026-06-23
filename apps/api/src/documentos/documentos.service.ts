import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ModoSubstituicaoDocumento, OrigemDocumentoAdmissao, Prisma, ResultadoValidacaoOcr, Role, StatusDocumentoAdmissao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentoValidationService } from './documento-validation.service';
import { defaultDocumentosAdmissao } from './default-documentos';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { OcrService } from './ocr.service';
import { S3StorageService } from './s3-storage.service';

type Substitui = { substituidoTemplateId: number; modo: ModoSubstituicaoDocumento; campoOcr: string | null };
type VirtualTemplate = { palavrasChave: string[]; substitui: Substitui[] } | null;

type UploadedMemoryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const inferContentType = (contentType: string, filename: string, buffer: Buffer) => {
  if (buffer.subarray(0, 4).toString('utf8') === '%PDF') return 'application/pdf';
  if (filename.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return contentType;
};

const isReviewStatus = (status: StatusDocumentoAdmissao) =>
  status === StatusDocumentoAdmissao.APROVADO ||
  status === StatusDocumentoAdmissao.RECUSADO ||
  status === StatusDocumentoAdmissao.REENVIO_SOLICITADO;

const documentoInclude = {
  template: { include: { substitui: true } },
  dispensadoPor: { select: { id: true, nome: true } },
} as const;

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: OcrService,
    private readonly validation: DocumentoValidationService,
    private readonly s3: S3StorageService,
  ) {}

  async listMyDocumentos(userId: number) {
    const candidaturas = await this.prisma.candidatura.findMany({
      where: { candidato: { userId } },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        documentos: { include: documentoInclude, orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      candidaturas.map(async (candidatura) => ({
        ...candidatura,
        documentos: await this.buildMergedDocumentos(candidatura),
      })),
    );
  }

  async listForRh() {
    const candidaturas = await this.prisma.candidatura.findMany({
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        documentos: { include: documentoInclude, orderBy: { id: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    await Promise.all(candidaturas.map((candidatura) => this.ensureDocumentos(candidatura.id)));

    const refreshed = await this.prisma.candidatura.findMany({
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        documentos: { include: documentoInclude, orderBy: { id: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      refreshed.map(async (candidatura) => ({
        ...candidatura,
        documentos: await this.buildMergedDocumentos(candidatura),
      })),
    );
  }

  async uploadMyDocumento(
    userId: number,
    documentoId: number,
    file?: UploadedMemoryFile,
    candidaturaId?: number,
    templateId?: number,
    codigo?: string,
    confirmarEnvio = false,
    observacaoCandidato?: string,
  ) {
    if (documentoId === 0) {
      if (!candidaturaId) throw new BadRequestException('candidaturaId é obrigatório para novo documento.');
      const candidatura = await this.prisma.candidatura.findFirst({ where: { id: candidaturaId, candidato: { userId } } });
      if (!candidatura) throw new ForbiddenException('Candidatura não encontrada ou acesso negado.');

      let docId: number;

      if (templateId) {
        const template = await this.prisma.documentoTemplate.findUnique({ where: { id: templateId } });
        if (!template) throw new NotFoundException('Template não encontrado.');
        const existing = await this.prisma.documentoAdmissao.findFirst({ where: { candidaturaId, codigo: template.codigo } });
        const doc = existing ?? await this.prisma.documentoAdmissao.create({
          data: { candidaturaId, templateId, codigo: template.codigo, nome: template.nome, descricao: template.descricao, obrigatorio: template.obrigatorio },
        });
        docId = doc.id;
      } else if (codigo) {
        const def = defaultDocumentosAdmissao.find((d) => d.codigo === codigo);
        if (!def) throw new NotFoundException('Documento padrão não encontrado.');
        const existing = await this.prisma.documentoAdmissao.findFirst({ where: { candidaturaId, codigo, templateId: null } });
        const doc = existing ?? await this.prisma.documentoAdmissao.create({
          data: { candidaturaId, codigo: def.codigo, nome: def.nome, descricao: def.descricao, obrigatorio: def.obrigatorio },
        });
        docId = doc.id;
      } else {
        throw new BadRequestException('templateId ou codigo são obrigatórios para novo documento.');
      }

      return this.saveUpload(docId, file, OrigemDocumentoAdmissao.CANDIDATO, confirmarEnvio, observacaoCandidato);
    }

    const documento = await this.findDocumento(documentoId);
    if (documento.candidatura.candidato.userId !== userId) {
      throw new ForbiddenException('Documento não pertence ao candidato autenticado.');
    }
    if (documento.status === StatusDocumentoAdmissao.APROVADO) {
      throw new BadRequestException('Não é possível substituir um documento aprovado.');
    }

    return this.saveUpload(documentoId, file, OrigemDocumentoAdmissao.CANDIDATO, confirmarEnvio, observacaoCandidato);
  }

  async uploadRhDocumento(userId: number, documentoId: number, file?: UploadedMemoryFile) {
    await this.ensureRh(userId);
    await this.findDocumento(documentoId);

    return this.saveUpload(documentoId, file, OrigemDocumentoAdmissao.RH, false, undefined, true);
  }

  async revisarDocumento(userId: number, documentoId: number, dto: RevisarDocumentoDto) {
    await this.ensureRh(userId);
    if (!isReviewStatus(dto.status)) {
      throw new BadRequestException('Status de revisão inválido.');
    }

    await this.findDocumento(documentoId);

    return this.prisma.documentoAdmissao.update({
      where: { id: documentoId },
      data: {
        status: dto.status,
        observacaoRh: dto.observacaoRh?.trim() || null,
        revisadoEm: new Date(),
        revisadoPorId: userId,
      },
      include: { candidatura: { include: { candidato: true, requisicao: true } }, revisadoPor: true },
    });
  }

  async deleteMyDocumento(userId: number, documentoId: number) {
    const documento = await this.findDocumento(documentoId);
    if (documento.candidatura.candidato.userId !== userId) {
      throw new ForbiddenException('Documento não pertence ao candidato autenticado.');
    }
    if (documento.status === StatusDocumentoAdmissao.APROVADO) {
      throw new BadRequestException('Não é possível remover um documento aprovado.');
    }

    return this.clearDocumento(documentoId);
  }

  async deleteRhDocumento(userId: number, documentoId: number) {
    await this.ensureRh(userId);
    await this.findDocumento(documentoId);

    return this.clearDocumento(documentoId);
  }

  async getDocumentoFile(userId: number, documentoId: number) {
    const documento = await this.findDocumento(documentoId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isOwner = documento.candidatura.candidato.userId === userId;
    const isRh = user?.role === Role.RH || user?.role === Role.ADMIN;
    if (!isOwner && !isRh) throw new ForbiddenException('Acesso negado ao documento.');
    if (!documento.storagePath || !documento.mimeType || !documento.arquivoNome) {
      throw new NotFoundException('Documento não possui arquivo enviado.');
    }

    const buffer = await this.s3.download(documento.storagePath);
    return {
      buffer,
      contentType: inferContentType(documento.mimeType, documento.arquivoNome, buffer),
      filename: documento.arquivoNome,
    };
  }

  async ensureDocumentos(candidaturaId: number) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, requisicao: true },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');

    const templates = candidatura.requisicao.empresaId
      ? await this.prisma.documentoTemplate.findMany({
          where: { empresaId: candidatura.requisicao.empresaId },
          orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
        })
      : [];

    if (templates.length > 0) {
      await this.prisma.documentoAdmissao.createMany({
        data: templates
          .filter((template) => this.templateAppliesToCandidate(template, candidatura.candidato))
          .map((template) => ({
            candidaturaId,
            templateId: template.id,
            codigo: template.codigo,
            nome: template.nome,
            descricao: template.descricao,
            obrigatorio: template.obrigatorio,
          })),
        skipDuplicates: true,
      });
      return;
    }

    await this.prisma.documentoAdmissao.createMany({
      data: defaultDocumentosAdmissao.map((documento) => ({ ...documento, candidaturaId })),
      skipDuplicates: true,
    });
  }

  private async buildMergedDocumentos(candidatura: {
    id: number;
    candidato: { genero: string | null; possuiFilhos: boolean };
    requisicao: { empresaId: number | null };
    documentos: Array<ReturnType<typeof Object.assign> & { id: number; templateId: number | null; codigo: string }>;
  }) {
    const templates = candidatura.requisicao.empresaId
      ? await this.prisma.documentoTemplate.findMany({
          where: { empresaId: candidatura.requisicao.empresaId },
          include: { substitui: true },
          orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
        })
      : [];

    const existingDocs = candidatura.documentos;

    if (templates.length > 0) {
      const matchedIds = new Set<number>();
      const list = templates
        .filter((t) => this.templateAppliesToCandidate(t, candidatura.candidato))
        .map((template) => {
          const existing = existingDocs.find((d) => d.templateId === template.id || d.codigo === template.codigo);
          if (existing) matchedIds.add(existing.id);
          return existing ?? this.makeVirtualDoc(candidatura.id, template.id, template.codigo, template.nome, template.descricao, template.obrigatorio, { palavrasChave: template.palavrasChave, substitui: template.substitui });
        });
      const orphans = existingDocs.filter((d) => !matchedIds.has(d.id) && d.status !== StatusDocumentoAdmissao.PENDENTE);
      return [...list, ...orphans];
    }

    const matchedIds = new Set<number>();
    const list = defaultDocumentosAdmissao.map((def) => {
      const existing = existingDocs.find((d) => d.codigo === def.codigo && d.templateId === null);
      if (existing) matchedIds.add(existing.id);
      return existing ?? this.makeVirtualDoc(candidatura.id, null, def.codigo, def.nome, def.descricao, def.obrigatorio, null);
    });
    const orphans = existingDocs.filter((d) => !matchedIds.has(d.id) && d.status !== StatusDocumentoAdmissao.PENDENTE);
    return [...list, ...orphans];
  }

  private makeVirtualDoc(
    candidaturaId: number,
    templateId: number | null,
    codigo: string,
    nome: string,
    descricao: string | null,
    obrigatorio: boolean,
    template: VirtualTemplate,
  ) {
    return {
      id: 0,
      candidaturaId,
      templateId,
      codigo,
      nome,
      descricao,
      obrigatorio,
      status: StatusDocumentoAdmissao.PENDENTE,
      origem: null,
      arquivoNome: null,
      mimeType: null,
      tamanhoBytes: null,
      storagePath: null,
      enviadoEm: null,
      revisadoEm: null,
      revisadoPorId: null,
      observacaoRh: null,
      ocrTexto: null,
      ocrResultado: null,
      ocrScore: null,
      ocrMotivos: [],
      ocrCampos: null,
      ocrValidadoEm: null,
      dispensadoPorId: null,
      dispensadoPor: null,
      template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async saveUpload(
    documentoId: number,
    file: UploadedMemoryFile | undefined,
    origem: OrigemDocumentoAdmissao,
    confirmarEnvio = false,
    observacaoCandidato?: string,
    skipOcrValidation = false,
  ) {
    const documento = await this.findDocumento(documentoId);
    this.validateFile(file, documento.template?.mimeTypesPermitidos ?? []);

    // OCR antes do S3 — valida o conteúdo antes de persistir
    const ocrResult = await this.ocr.extractText(file.buffer, file.mimetype);
    const { text: ocrTexto, campos } = ocrResult;
    const validacao = this.validation.validate(documento, ocrResult);

    if (!skipOcrValidation) {
      this.validateOcrResult(validacao, confirmarEnvio, observacaoCandidato);
    }

    const cpf = documento.candidatura.candidato.cpf ?? null;
    const storagePath = this.s3.buildKey(cpf, documentoId, file.originalname);
    await this.s3.upload(storagePath, file.buffer, file.mimetype);

    const updated = await this.prisma.documentoAdmissao.update({
      where: { id: documentoId },
      data: {
        status: StatusDocumentoAdmissao.ENVIADO,
        origem,
        arquivoNome: file.originalname,
        mimeType: file.mimetype,
        tamanhoBytes: file.size,
        storagePath,
        enviadoEm: new Date(),
        revisadoEm: null,
        revisadoPorId: null,
        observacaoRh: null,
        observacaoCandidato: observacaoCandidato?.trim() || null,
        ocrTexto: ocrTexto || null,
        ocrResultado: validacao.resultado,
        ocrScore: validacao.score,
        ocrMotivos: validacao.motivos,
        ocrCampos: JSON.parse(JSON.stringify(validacao.campos)),
        ocrValidadoEm: new Date(),
        dispensadoPorId: null,
      },
      include: {
        ...documentoInclude,
        candidatura: { include: { candidato: true, requisicao: true } },
      },
    });

    // Aplicar regras de substituição com base no OCR
    if (updated.templateId && updated.template) {
      await this.applySubstituicoes(updated, ocrTexto, campos);
    }

    return updated;
  }

  private async applySubstituicoes(
    documento: { id: number; candidaturaId: number; templateId: number | null; template: { substitui: { substituidoTemplateId: number; modo: ModoSubstituicaoDocumento; campoOcr: string | null }[] } | null },
    ocrTexto: string,
    campos: { cpf?: string; data?: string },
  ) {
    const regras = documento.template?.substitui ?? [];
    if (regras.length === 0) return;

    // Carregar dados do candidato para validação de CAMPO_OCR
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: documento.candidaturaId },
      include: { candidato: true },
    });

    for (const regra of regras) {
      const docSubstituido = await this.prisma.documentoAdmissao.findFirst({
        where: {
          candidaturaId: documento.candidaturaId,
          templateId: regra.substituidoTemplateId,
          status: { not: StatusDocumentoAdmissao.APROVADO },
        },
      });

      if (!docSubstituido) continue;

      let dispensar = false;

      if (regra.modo === ModoSubstituicaoDocumento.SEMPRE) {
        dispensar = true;
      } else if (regra.modo === ModoSubstituicaoDocumento.CAMPO_OCR && regra.campoOcr === 'cpf') {
        const cpfCandidato = candidatura?.candidato.cpf?.replace(/\D/g, '') ?? '';
        const cpfOcr = campos.cpf ?? '';
        dispensar = Boolean(cpfOcr && cpfCandidato && cpfOcr === cpfCandidato);
      }

      if (dispensar) {
        await this.prisma.documentoAdmissao.update({
          where: { id: docSubstituido.id },
          data: { dispensadoPorId: documento.id },
        });
      }
    }
  }

  private validateOcrResult(
    validacao: { resultado: ResultadoValidacaoOcr; motivos: string[] },
    confirmarEnvio: boolean,
    observacaoCandidato?: string,
  ) {
    if (validacao.resultado === ResultadoValidacaoOcr.VALIDO) return;

    const message = validacao.motivos.join(' ');
    if (validacao.resultado === ResultadoValidacaoOcr.INVALIDO) {
      throw new HttpException({ code: 'DOCUMENTO_INVALIDO', message }, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    if (!confirmarEnvio) {
      throw new HttpException(
        { code: 'DOCUMENTO_SUSPEITO', message },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!observacaoCandidato?.trim() || observacaoCandidato.trim().length < 10) {
      throw new BadRequestException('Informe uma justificativa com pelo menos 10 caracteres para enviar este documento.');
    }
  }

  private async clearDocumento(documentoId: number) {
    const documento = await this.findDocumento(documentoId);
    if (documento.storagePath) {
      await this.s3.delete(documento.storagePath);
    }

    // Remover dispensações que este documento causou
    await this.prisma.documentoAdmissao.updateMany({
      where: { dispensadoPorId: documentoId },
      data: { dispensadoPorId: null },
    });

    return this.prisma.documentoAdmissao.update({
      where: { id: documentoId },
      data: {
        status: StatusDocumentoAdmissao.PENDENTE,
        origem: null,
        arquivoNome: null,
        mimeType: null,
        tamanhoBytes: null,
        storagePath: null,
        enviadoEm: null,
        revisadoEm: null,
        revisadoPorId: null,
        observacaoRh: null,
        ocrTexto: null,
        ocrResultado: null,
        ocrScore: null,
        ocrMotivos: [],
        ocrCampos: Prisma.JsonNull,
        ocrValidadoEm: null,
        dispensadoPorId: null,
      },
      include: { candidatura: { include: { candidato: true, requisicao: true } } },
    });
  }

  private validateFile(
    file: UploadedMemoryFile | undefined,
    templateMimeTypes: string[],
  ): asserts file is UploadedMemoryFile {
    if (!file) throw new BadRequestException('Envie um arquivo.');
    const allowed = templateMimeTypes.length > 0 ? new Set(templateMimeTypes) : allowedMimeTypes;
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo inválido. Permitidos: ${Array.from(allowed).join(', ')}.`,
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('O arquivo deve ter no máximo 10MB.');
    }
  }

  private async findDocumento(id: number) {
    const documento = await this.prisma.documentoAdmissao.findUnique({
      where: { id },
      include: {
        template: { include: { substitui: true } },
        dispensadoPor: { select: { id: true, nome: true } },
        candidatura: { include: { candidato: true, requisicao: true } },
      },
    });
    if (!documento) throw new NotFoundException('Documento não encontrado.');

    return documento;
  }

  private async ensureRh(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== Role.RH && user.role !== Role.ADMIN)) {
      throw new ForbiddenException('Acesso restrito ao RH.');
    }
  }

  private templateAppliesToCandidate(
    template: { condicaoGenero: string | null; condicaoPossuiFilhos: boolean | null },
    candidato: { genero: string | null; possuiFilhos: boolean },
  ) {
    if (template.condicaoGenero && template.condicaoGenero !== candidato.genero) return false;
    if (
      template.condicaoPossuiFilhos !== null &&
      template.condicaoPossuiFilhos !== candidato.possuiFilhos
    ) {
      return false;
    }

    return true;
  }
}
