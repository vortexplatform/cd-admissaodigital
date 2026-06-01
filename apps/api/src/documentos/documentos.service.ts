import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModoSubstituicaoDocumento, OrigemDocumentoAdmissao, Role, StatusDocumentoAdmissao } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { defaultDocumentosAdmissao } from './default-documentos';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { OcrService } from './ocr.service';

type UploadedMemoryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'documentos-admissao');
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

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

    await Promise.all(candidaturas.map((candidatura) => this.ensureDocumentos(candidatura.id)));

    return this.prisma.candidatura.findMany({
      where: { candidato: { userId } },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        documentos: { include: documentoInclude, orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForRh() {
    const candidaturas = await this.prisma.candidatura.findMany({
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        documentos: { orderBy: { id: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    await Promise.all(candidaturas.map((candidatura) => this.ensureDocumentos(candidatura.id)));

    return this.prisma.candidatura.findMany({
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        documentos: { orderBy: { id: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async uploadMyDocumento(userId: number, documentoId: number, file?: UploadedMemoryFile) {
    const documento = await this.findDocumento(documentoId);
    if (documento.candidatura.candidato.userId !== userId) {
      throw new ForbiddenException('Documento não pertence ao candidato autenticado.');
    }
    if (documento.status === StatusDocumentoAdmissao.APROVADO) {
      throw new BadRequestException('Não é possível substituir um documento aprovado.');
    }

    return this.saveUpload(documentoId, file, OrigemDocumentoAdmissao.CANDIDATO);
  }

  async uploadRhDocumento(userId: number, documentoId: number, file?: UploadedMemoryFile) {
    await this.ensureRh(userId);
    await this.findDocumento(documentoId);

    return this.saveUpload(documentoId, file, OrigemDocumentoAdmissao.RH);
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

    const buffer = await fs.readFile(documento.storagePath);
    return { buffer, contentType: documento.mimeType, filename: documento.arquivoNome };
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

  private async saveUpload(
    documentoId: number,
    file: UploadedMemoryFile | undefined,
    origem: OrigemDocumentoAdmissao,
  ) {
    const documento = await this.findDocumento(documentoId);
    this.validateFile(file, documento.template?.mimeTypesPermitidos ?? []);

    await fs.mkdir(uploadsRoot, { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = path.join(uploadsRoot, `${documentoId}-${Date.now()}-${safeName}`);
    await fs.writeFile(storagePath, file.buffer);

    // Rodar OCR (falha silenciosa — não bloqueia upload)
    const { text: ocrTexto, campos } = await this.ocr.extractText(file.buffer, file.mimetype);

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
        ocrTexto: ocrTexto || null,
        ocrValidadoEm: ocrTexto ? new Date() : null,
        // Limpar dispensações anteriores ao reenviar
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

  private async clearDocumento(documentoId: number) {
    const documento = await this.findDocumento(documentoId);
    if (documento.storagePath) {
      await fs.rm(documento.storagePath, { force: true });
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
