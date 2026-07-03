import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  MetodoAssinatura,
  Role,
  SetorAssinatura,
  StatusCandidatura,
  StatusDocumentoAdmissao,
  StatusDocumentoAssinatura,
  StatusEnvelopeAssinatura,
  StatusRequisicaoVaga,
  TipoEventoAssinatura,
} from '@prisma/client';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { EmailService } from '../auth/email.service';
import { OtpService } from '../auth/otp.service';
import { SmsService } from '../auth/sms.service';
import { DocumentosTemplatesService } from '../documentos-templates/documentos-templates.service';
import { drawHeader, wrapText } from '../documentos-templates/pdf-render.utils';
import { EmpresaCertificadosService } from '../empresas/empresa-certificados.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentosService } from './documentos.service';
import { PdfDigitalSignatureService } from './pdf-digital-signature.service';
import { S3StorageService } from './s3-storage.service';

type RequestEvidence = { ip?: string; userAgent?: string };

const assinaturaTemplates = {
  [SetorAssinatura.ADM_PESSOAL]: [
    ['contrato-experiencia', 'Contrato de Experiência'],
    ['declaracao-treinamento-biometrico', 'Declaração de Treinamento - Registro Eletrônico Biométrico'],
    ['acordo-domingos-feriados', 'Acordo para Trabalho aos Domingos e Feriados'],
    ['autorizacao-plano-saude', 'Autorização Desconto Plano de Saúde'],
    ['termo-prorrogacao-experiencia', 'Termo de Prorrogação do Contrato de Experiência'],
  ],
  [SetorAssinatura.SESMT]: [],
} satisfies Record<SetorAssinatura, [string, string][]>;

@Injectable()
export class AssinaturasService {
  private readonly logger = new Logger(AssinaturasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly documentos: DocumentosService,
    private readonly certificados: EmpresaCertificadosService,
    private readonly pdfDigitalSignature: PdfDigitalSignatureService,
    private readonly documentosTemplates: DocumentosTemplatesService,
    private readonly s3: S3StorageService,
  ) {}

  async listMyEnvelopes(userId: number) {
    return this.prisma.candidatura.findMany({
      where: { candidato: { userId }, envelopesAssinatura: { some: {} } },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForRh(userId: number) {
    await this.ensureRh(userId);

    return this.prisma.candidatura.findMany({
      where: { envelopesAssinatura: { some: {} } },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listFiltrosRh(userId: number) {
    await this.ensureRh(userId);

    const requisicoes = await this.prisma.requisicaoVaga.findMany({
      where: {
        OR: [
          { candidaturas: { some: { envelopesAssinatura: { some: {} } } } },
          { candidaturas: { some: this.aprovadosWhere() } },
        ],
      },
      select: { filial: true, filialNome: true, ccustoNome: true, cargoNome: true, cargo: true },
    });

    const filiaisMap = new Map<number, string | null>();
    const setores = new Set<string>();
    const cargos = new Set<string>();

    for (const r of requisicoes) {
      if (r.filial != null) filiaisMap.set(r.filial, r.filialNome ?? null);
      if (r.ccustoNome) setores.add(r.ccustoNome);
      const cargoLabel = r.cargoNome ?? r.cargo;
      if (cargoLabel) cargos.add(cargoLabel);
    }

    return {
      filiais: [...filiaisMap.entries()]
        .map(([numero, nome]) => ({ numero, nome }))
        .sort((a, b) => a.numero - b.numero),
      setores: [...setores].sort(),
      cargos: [...cargos].sort(),
    };
  }

  private aprovadosWhere(): Prisma.CandidaturaWhereInput {
    return {
      status: StatusCandidatura.APROVADO,
      envelopesAssinatura: { none: {} },
    };
  }

  async listForRhPaginado(
    userId: number,
    page: number,
    limit: number,
    situacao: 'PENDENTES' | 'CONCLUIDAS' | 'TODAS' | 'APROVADOS',
    filters: { filial?: number; setor?: string; cargo?: string },
  ) {
    await this.ensureRh(userId);

    const skip = (page - 1) * limit;

    const requisicaoFilter: Prisma.RequisicaoVagaWhereInput = {};
    if (filters.filial != null) requisicaoFilter.filial = filters.filial;
    if (filters.setor) requisicaoFilter.ccustoNome = { contains: filters.setor, mode: 'insensitive' };
    if (filters.cargo) {
      requisicaoFilter.OR = [
        { cargoNome: { contains: filters.cargo, mode: 'insensitive' } },
        { cargo: { contains: filters.cargo, mode: 'insensitive' } },
      ];
    }

    const situacaoFilter: Prisma.CandidaturaWhereInput =
      situacao === 'APROVADOS'
        ? this.aprovadosWhere()
        : situacao === 'PENDENTES'
          ? { envelopesAssinatura: { some: { status: { not: StatusEnvelopeAssinatura.CONCLUIDO } } } }
          : situacao === 'CONCLUIDAS'
            ? {
                envelopesAssinatura: { some: {} },
                NOT: { envelopesAssinatura: { some: { status: { not: StatusEnvelopeAssinatura.CONCLUIDO } } } },
              }
            : { envelopesAssinatura: { some: {} } };

    const where: Prisma.CandidaturaWhereInput = {
      ...situacaoFilter,
      ...(Object.keys(requisicaoFilter).length > 0 ? { requisicao: requisicaoFilter } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.candidatura.count({ where }),
      this.prisma.candidatura.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          admissao: true,
          candidato: { select: { id: true, nome: true, cpf: true } },
          requisicao: {
            select: {
              id: true,
              cargo: true,
              cargoNome: true,
              ccustoNome: true,
              filial: true,
              dataPrevistaAdmissao: true,
              empresa: { select: { nome: true } },
            },
          },
          envelopesAssinatura: { select: { id: true, setor: true, status: true } },
        },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async gerarParaRh(userId: number, candidaturaId: number) {
    await this.ensureRh(userId);
    await this.documentos.ensureDocumentos(candidaturaId);

    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, documentos: true },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    if (!candidatura.candidato.userId) {
      throw new BadRequestException('Candidato ainda não possui usuário vinculado para assinar.');
    }
    if (!this.canStartSignature(candidatura.documentos)) {
      throw new BadRequestException('Aprove ou dispense todos os documentos obrigatórios antes de gerar assinaturas.');
    }

    await this.ensureEnvelopes(candidatura.id, candidatura.candidato.userId, userId);

    return this.prisma.candidatura.findUnique({
      where: { id: candidatura.id },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async sendOtp(userId: number, envelopeId: number, evidence: RequestEvidence) {
    const envelope = await this.findEnvelopeForUser(userId, envelopeId);
    if (envelope.status === StatusEnvelopeAssinatura.CONCLUIDO) {
      throw new BadRequestException('Envelope já concluído.');
    }

    const identifier = this.signatureIdentifier(envelope.candidatura.candidato);
    const code = this.otp.generate();
    await this.otp.save(identifier, code);
    await this.deliverOtp(identifier, code);

    await this.prisma.envelopeAssinatura.update({
      where: { id: envelope.id },
      data: {
        status: StatusEnvelopeAssinatura.AGUARDANDO_OTP,
        otpIdentifier: identifier,
        sessionToken: null,
        sessionExpiraEm: null,
      },
    });
    await this.recordEvent(envelope.id, TipoEventoAssinatura.OTP_ENVIADO, evidence, {
      identifierMasked: this.maskIdentifier(identifier),
    });

    return { message: 'Código enviado.', identifier: this.maskIdentifier(identifier) };
  }

  async verifyOtp(userId: number, envelopeId: number, code: string, evidence: RequestEvidence) {
    const envelope = await this.findEnvelopeForUser(userId, envelopeId);
    if (!envelope.otpIdentifier) throw new BadRequestException('Solicite o código antes de validar.');

    const valid = await this.otp.verify(envelope.otpIdentifier, code);
    if (!valid) throw new ForbiddenException('Código inválido ou expirado.');

    const sessionToken = randomUUID();
    const sessionExpiraEm = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.envelopeAssinatura.update({
      where: { id: envelope.id },
      data: { status: StatusEnvelopeAssinatura.OTP_VALIDADO, otpValidadoEm: new Date(), sessionToken, sessionExpiraEm },
    });
    await this.recordEvent(envelope.id, TipoEventoAssinatura.OTP_VALIDADO, evidence);

    return { sessionToken, sessionExpiraEm };
  }

  async viewDocument(userId: number, documentoId: number, evidence: RequestEvidence) {
    const documento = await this.findDocumentForUser(userId, documentoId);
    if (documento.empresaPdfFinalStoragePath) return this.s3.download(documento.empresaPdfFinalStoragePath);
    if (documento.empresaPdfFinal) return Buffer.from(documento.empresaPdfFinal);

    if (!documento.visualizadoEm) {
      await this.prisma.documentoAssinatura.update({
        where: { id: documento.id },
        data: { visualizadoEm: new Date() },
      });
      await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_VISUALIZADO, evidence, {
        documentoId: documento.id,
      });
    }

    return this.renderDocumentoPdf(documento);
  }

  async viewDocumentForRh(userId: number, documentoId: number) {
    await this.ensureRh(userId);
    const documento = await this.prisma.documentoAssinatura.findUnique({ where: { id: documentoId } });
    if (!documento) throw new NotFoundException('Documento de assinatura não encontrado.');
    if (documento.empresaPdfFinalStoragePath) return this.s3.download(documento.empresaPdfFinalStoragePath);
    if (documento.empresaPdfFinal) return Buffer.from(documento.empresaPdfFinal);

    return this.renderDocumentoPdf(documento);
  }

  async signDocument(userId: number, documentoId: number, sessionToken: string, evidence: RequestEvidence) {
    const documento = await this.findDocumentForUser(userId, documentoId);
    if (documento.status === StatusDocumentoAssinatura.ASSINADO) return documento;
    if (!documento.visualizadoEm) throw new BadRequestException('Visualize o documento antes de assinar.');

    this.validateSession(documento.envelope, sessionToken);

    const candidato = documento.envelope.candidatura.candidato;
    const otpIdentifier = documento.envelope.otpIdentifier;
    const assinaturaEmail = otpIdentifier?.includes('@') ? otpIdentifier : null;
    const assinaturaTelefone = otpIdentifier && !otpIdentifier.includes('@') ? otpIdentifier : null;

    const signedAt = new Date();
    const codigoVerificacao = this.generateVerificationCode();
    const pdfCandidato = await this.renderDocumentoPdf({
        ...documento,
        status: StatusDocumentoAssinatura.ASSINADO,
        assinadoEm: signedAt,
        assinaturaNome: candidato.nome ?? documento.envelope.user.nome,
        assinaturaCpf: candidato.cpf,
        assinaturaIp: evidence.ip ?? null,
        assinaturaUserAgent: evidence.userAgent ?? null,
        codigoVerificacao,
        hashAssinado: null,
      });
    const hashAssinado = this.hashBuffer(pdfCandidato);

    const signed = await this.prisma.documentoAssinatura.update({
      where: { id: documento.id },
      data: {
        status: StatusDocumentoAssinatura.ASSINADO,
        assinadoEm: signedAt,
        assinaturaNome: candidato.nome ?? documento.envelope.user.nome,
        assinaturaCpf: candidato.cpf,
        assinaturaIp: evidence.ip,
        assinaturaUserAgent: evidence.userAgent,
        assinaturaEmail,
        assinaturaTelefone,
        metodoAssinatura: MetodoAssinatura.OTP,
        codigoVerificacao,
        hashAssinado,
      },
    });

    await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_ASSINADO, evidence, {
      documentoId: documento.id,
      hashOriginal: documento.hashOriginal,
      hashAssinado,
      codigoVerificacao,
    });
    await this.concludeEnvelopeIfComplete(documento.envelopeId);

    return signed;
  }

  async signEnvelopeByBiometria(envelopeId: number, biometriaSolicitacaoId: number, evidence: RequestEvidence) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: {
        candidatura: { include: { candidato: true, requisicao: { include: { empresa: true } } } },
        user: true,
        documentos: { orderBy: { ordem: 'asc' } },
      },
    });
    if (!envelope) throw new NotFoundException('Envelope não encontrado.');

    const solicitacao = await this.prisma.biometriaSolicitacao.findUnique({
      where: { id: biometriaSolicitacaoId },
      include: { dispositivo: true, solicitadaPor: true },
    });
    if (!solicitacao || solicitacao.envelopeId !== envelope.id) {
      throw new BadRequestException('Solicitação biométrica inválida para o envelope.');
    }

    const candidato = envelope.candidatura.candidato;
    const signedAt = solicitacao.concluidaEm ?? new Date();
    const pendingDocuments = envelope.documentos.filter(
      (documento) => documento.status !== StatusDocumentoAssinatura.ASSINADO,
    );

    for (const documento of pendingDocuments) {
      const codigoVerificacao = this.generateVerificationCode();
      const assinaturaUserAgent = solicitacao.dispositivo
        ? `Biometria: ${solicitacao.dispositivo.nome}`
        : evidence.userAgent;
      const pdfCandidato = await this.renderDocumentoPdf({
        ...documento,
        status: StatusDocumentoAssinatura.ASSINADO,
        assinadoEm: signedAt,
        assinaturaNome: candidato.nome ?? envelope.user.nome,
        assinaturaCpf: candidato.cpf,
        assinaturaIp: evidence.ip ?? null,
        assinaturaUserAgent: assinaturaUserAgent ?? null,
        metodoAssinatura: MetodoAssinatura.BIOMETRIA,
        codigoVerificacao,
        hashAssinado: null,
      });
      const hashAssinado = this.hashBuffer(pdfCandidato);

      await this.prisma.documentoAssinatura.update({
        where: { id: documento.id },
        data: {
          status: StatusDocumentoAssinatura.ASSINADO,
          assinadoEm: signedAt,
          assinaturaNome: candidato.nome ?? envelope.user.nome,
          assinaturaCpf: candidato.cpf,
          assinaturaIp: evidence.ip,
          assinaturaUserAgent,
          metodoAssinatura: MetodoAssinatura.BIOMETRIA,
          biometriaSolicitacaoId,
          codigoVerificacao,
          hashAssinado,
        },
      });
      await this.recordEvent(envelope.id, TipoEventoAssinatura.DOCUMENTO_ASSINADO_BIOMETRIA, evidence, {
        documentoId: documento.id,
        biometriaSolicitacaoId,
        dispositivoId: solicitacao.dispositivoId,
        dispositivoNome: solicitacao.dispositivo?.nome,
        solicitadoPorId: solicitacao.solicitadaPorId,
        solicitadoPorNome: solicitacao.solicitadaPor.nome,
        hashOriginal: documento.hashOriginal,
        hashAssinado,
        codigoVerificacao,
      });
    }

    await this.certifyEnvelopeDocuments(envelope.id);
    await this.concludeEnvelopeIfComplete(envelope.id);
  }

  private async ensureEnvelopes(candidaturaId: number, userId: number, geradoPorUserId?: number) {
    for (const setor of Object.values(SetorAssinatura)) {
      const templates = assinaturaTemplates[setor];
      if (templates.length === 0) continue;

      const envelope = await this.prisma.envelopeAssinatura.upsert({
        where: { candidaturaId_setor: { candidaturaId, setor } },
        create: { candidaturaId, userId, setor, geradoPorUserId: geradoPorUserId ?? null },
        update: {},
      });
      await this.ensureDocuments(envelope.id, candidaturaId, setor);
      await this.recordEvent(envelope.id, TipoEventoAssinatura.ENVELOPE_CRIADO, {});
    }

    await this.prisma.requisicaoVaga.updateMany({
      where: { candidaturas: { some: { id: candidaturaId } } },
      data: { status: StatusRequisicaoVaga.AGUARDANDO_ASSINATURA },
    });
  }

  private async ensureDocuments(envelopeId: number, candidaturaId: number, setor: SetorAssinatura) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      select: { candidato: { select: { cpf: true } }, requisicao: { select: { prorrogacaoDias: true } } },
    });
    const cpf = candidatura?.candidato?.cpf ?? null;
    const prorrogacaoDias = candidatura?.requisicao?.prorrogacaoDias;

    const templates = assinaturaTemplates[setor].filter(([codigo]) => {
      if (codigo === 'termo-prorrogacao-experiencia') return !!prorrogacaoDias && prorrogacaoDias > 0;
      return true;
    });

    await Promise.all(
      templates.map(async ([codigo, nome], index) => {
        const pdfBuffer = await this.documentosTemplates.gerarPdf(codigo, candidaturaId);
        const key = this.buildAssinaturaKey(cpf, envelopeId, codigo, 'original');
        await this.s3.upload(key, pdfBuffer, 'application/pdf');
        return this.prisma.documentoAssinatura.upsert({
          where: { envelopeId_codigo: { envelopeId, codigo } },
          create: {
            envelopeId,
            codigo,
            nome,
            descricao: `Documento de assinatura eletrônica avançada do setor ${setor}.`,
            ordem: index + 1,
            conteudoStoragePath: key,
            hashOriginal: this.hashBuffer(pdfBuffer),
          },
          update: {},
        });
      }),
    );
  }

  private canStartSignature(documentos: { obrigatorio: boolean; status: StatusDocumentoAdmissao; dispensadoPorId: number | null; templateId: number | null }[]) {
    const documentosAtuais = documentos.some((documento) => documento.templateId !== null)
      ? documentos.filter((documento) => documento.templateId !== null)
      : documentos;
    const obrigatorios = documentosAtuais.filter((documento) => documento.obrigatorio);
    if (obrigatorios.length === 0) return false;

    return obrigatorios.every((documento) => {
      if (documento.dispensadoPorId) return true;
      return documento.status === StatusDocumentoAdmissao.APROVADO;
    });
  }

  private async renderDocumentoPdf(documento: {
    nome: string;
    conteudo: string | null;
    conteudoStoragePath?: string | null;
    hashOriginal: string;
    hashAssinado: string | null;
    status: StatusDocumentoAssinatura;
    assinadoEm: Date | null;
    assinaturaNome: string | null;
    assinaturaCpf: string | null;
    assinaturaIp: string | null;
    assinaturaUserAgent: string | null;
    metodoAssinatura?: MetodoAssinatura | null;
    codigoVerificacao: string | null;
    // Dados da empresa (preenchidos ao certificar com A1)
    empresaCertSubject?: string | null;
    empresaCertIssuer?: string | null;
    empresaCertSerial?: string | null;
    empresaAssinouEm?: Date | null;
    empresaPdfHash?: string | null;
    empresaRepresentanteNome?: string | null;
    empresaRepresentanteCpf?: string | null;
    empresaRepresentanteCargo?: string | null;
    empresaRepresentanteEmail?: string | null;
    empresaIp?: string | null;
    empresaUserAgent?: string | null;
  }): Promise<Buffer> {
    if (documento.conteudoStoragePath) {
      const basePdf = await this.s3.download(documento.conteudoStoragePath);
      if (documento.status !== StatusDocumentoAssinatura.ASSINADO) {
        return basePdf;
      }
      const pdfDoc = await PDFDocument.load(basePdf);
      const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      this.drawAuditPage(pdfDoc, regular, bold, documento);
      return Buffer.from(await pdfDoc.save());
    }

    if (documento.conteudo && this.isBase64Pdf(documento.conteudo)) {
      const basePdf = Buffer.from(documento.conteudo, 'base64');
      if (documento.status !== StatusDocumentoAssinatura.ASSINADO) {
        return basePdf;
      }
      const pdfDoc = await PDFDocument.load(basePdf);
      const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      this.drawAuditPage(pdfDoc, regular, bold, documento);
      return Buffer.from(await pdfDoc.save());
    }

    // Compatibilidade com registros legados (texto simples)
    const pdf = await PDFDocument.create();
    pdf.setTitle(documento.nome);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]);
    let cursorY = drawHeader(page, bold);

    const [title, ...body] = (documento.conteudo ?? '').split('\n');
    page.drawText(title, { x: 70, y: cursorY, size: 13, font: bold, color: rgb(0, 0, 0) });
    cursorY -= 32;

    for (const paragraph of body) {
      if (!paragraph.trim()) { cursorY -= 10; continue; }
      for (const line of wrapText(paragraph, regular, 10, 455)) {
        if (cursorY < 70) { cursorY = 785; }
        page.drawText(line, { x: 70, y: cursorY, size: 10, font: regular, color: rgb(0, 0, 0) });
        cursorY -= 13;
      }
      cursorY -= 6;
    }

    if (documento.status === StatusDocumentoAssinatura.ASSINADO) {
      this.drawAuditPage(pdf, regular, bold, documento);
    }

    return Buffer.from(await pdf.save());
  }

  private isBase64Pdf(conteudo: string | null): boolean {
    if (!conteudo) return false;
    try {
      const decoded = Buffer.from(conteudo, 'base64');
      return decoded.subarray(0, 4).toString('ascii') === '%PDF';
    } catch {
      return false;
    }
  }

  private drawAuditPage(
    pdf: PDFDocument,
    regular: PDFFont,
    bold: PDFFont,
    documento: {
      hashOriginal: string;
      hashAssinado: string | null;
      assinadoEm: Date | null;
      assinaturaNome: string | null;
      assinaturaCpf: string | null;
      assinaturaIp: string | null;
      assinaturaUserAgent: string | null;
      metodoAssinatura?: MetodoAssinatura | null;
      codigoVerificacao: string | null;
      empresaCertSubject?: string | null;
      empresaCertIssuer?: string | null;
      empresaCertSerial?: string | null;
      empresaAssinouEm?: Date | null;
      empresaPdfHash?: string | null;
      empresaRepresentanteNome?: string | null;
      empresaRepresentanteCpf?: string | null;
      empresaRepresentanteCargo?: string | null;
      empresaRepresentanteEmail?: string | null;
      empresaIp?: string | null;
      empresaUserAgent?: string | null;
    },
  ) {
    const page = pdf.addPage([595.28, 841.89]);
    let cursorY = drawHeader(page, bold);

    const drawSection = (titulo: string) => {
      cursorY -= 8;
      page.drawLine({ start: { x: 70, y: cursorY }, end: { x: 525, y: cursorY }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
      cursorY -= 13;
      page.drawText(titulo, { x: 70, y: cursorY, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
      cursorY -= 13;
    };

    const drawRow = (label: string, value: string) => {
      if (cursorY < 60) return;
      page.drawText(`${label}:`, { x: 70, y: cursorY, size: 9, font: bold, color: rgb(0.15, 0.15, 0.15) });
      cursorY -= 13;
      for (const line of wrapText(value, regular, 8.5, 445)) {
        if (cursorY < 60) break;
        page.drawText(line, { x: 82, y: cursorY, size: 8.5, font: regular, color: rgb(0.2, 0.2, 0.2) });
        cursorY -= 11;
      }
      cursorY -= 3;
    };

    // Título
    page.drawText('Comprovante de Assinatura Eletrônica', { x: 70, y: cursorY, size: 13, font: bold, color: rgb(0.1, 0.1, 0.1) });
    cursorY -= 8;
    page.drawLine({ start: { x: 70, y: cursorY }, end: { x: 525, y: cursorY }, thickness: 0.8, color: rgb(0.2, 0.2, 0.2) });
    cursorY -= 18;

    // Seção COLABORADOR
    const metodoLabel =
      documento.metodoAssinatura === MetodoAssinatura.BIOMETRIA
        ? 'Assinatura biométrica assistida (verificação facial)'
        : 'Assinatura eletrônica avançada por OTP (MP 2.200-2/2001 e Lei 14.063/2020)';

    page.drawText('COLABORADOR', { x: 70, y: cursorY, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
    cursorY -= 13;
    drawRow('Assinado por', documento.assinaturaNome ?? 'Não informado');
    drawRow('CPF', documento.assinaturaCpf ? this.maskCpf(documento.assinaturaCpf) : 'Não informado');
    drawRow('Método de assinatura', metodoLabel);
    drawRow('Data/hora (UTC)', documento.assinadoEm?.toISOString() ?? 'Não informado');
    drawRow('Data/hora (Brasília)', documento.assinadoEm ? this.formatDateBrasilia(documento.assinadoEm) : 'Não informado');
    drawRow('IP público', documento.assinaturaIp ?? 'Não informado');
    drawRow('Dispositivo/Navegador', documento.assinaturaUserAgent ?? 'Não informado');
    drawRow('Código de verificação', documento.codigoVerificacao ?? 'Não informado');
    drawRow('Hash original SHA-256', documento.hashOriginal);
    drawRow('Hash após assinatura SHA-256', documento.hashAssinado ?? 'Não disponível');

    // Seção EMPRESA (condicional — só exibe se o certificado A1 foi aplicado)
    if (documento.empresaCertSubject) {
      const razaoSocial = this.parseSubjectRazaoSocial(documento.empresaCertSubject);
      const cnpj = this.parseSubjectCnpj(documento.empresaCertSubject);

      drawSection('EMPRESA');
      drawRow('Razão social', razaoSocial);
      if (cnpj) drawRow('CNPJ', this.formatarCnpjAudit(cnpj));
      drawRow('Certificado', 'e-CNPJ A1 ICP-Brasil');
      drawRow('Subject do certificado', documento.empresaCertSubject);
      drawRow('Emissor', documento.empresaCertIssuer ?? 'Não informado');
      drawRow('Número de série', documento.empresaCertSerial ?? 'Não informado');
      drawRow('Data/hora assinatura (UTC)', documento.empresaAssinouEm?.toISOString() ?? 'Não informado');
      drawRow('Data/hora assinatura (Brasília)', documento.empresaAssinouEm ? this.formatDateBrasilia(documento.empresaAssinouEm) : 'Não informado');
      drawRow('Hash SHA-256 do documento (pré-carimbo ICP-Brasil)', documento.empresaPdfHash ?? 'Não disponível');

      drawSection('RESPONSÁVEL PELA ASSINATURA DA EMPRESA');
      drawRow('Nome', documento.empresaRepresentanteNome ?? 'Não informado');
      drawRow('CPF', documento.empresaRepresentanteCpf ? this.maskCpf(documento.empresaRepresentanteCpf) : 'Não informado');
      drawRow('Cargo/função', documento.empresaRepresentanteCargo ?? 'Não informado');
      drawRow('E-mail', documento.empresaRepresentanteEmail ?? 'Não informado');
      drawRow('IP público', documento.empresaIp ?? 'Não informado');
      drawRow('Dispositivo/Navegador', documento.empresaUserAgent ?? 'Não informado');
      drawRow('Condição', 'Representante autorizado conforme certificado digital ICP-Brasil');
    }

    // Rodapé
    cursorY -= 10;
    if (cursorY > 60) {
      page.drawLine({ start: { x: 70, y: cursorY }, end: { x: 525, y: cursorY }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
      cursorY -= 12;
      page.drawText(
        'Este comprovante faz parte integrante do documento assinado. Verifique a autenticidade pelo código de verificação no sistema Admissão Digital.',
        { x: 70, y: cursorY, size: 7, font: regular, color: rgb(0.5, 0.5, 0.5) },
      );
    }
  }

  private maskCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
  }

  private formatDateBrasilia(date: Date): string {
    return (
      new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(date) + ' BRT'
    );
  }

  private parseSubjectCN(subject: string): string {
    const match = subject.match(/CN=([^,]+)/i);
    return match?.[1]?.trim() ?? subject;
  }

  // Extrai a razão social do subject (parte antes de ':' no CN)
  private parseSubjectRazaoSocial(subject: string): string {
    const cn = this.parseSubjectCN(subject);
    const colonIdx = cn.lastIndexOf(':');
    return colonIdx > 0 ? cn.slice(0, colonIdx).trim() : cn;
  }

  // Extrai o CNPJ do subject (parte após ':' no CN — 14 dígitos)
  private parseSubjectCnpj(subject: string): string | null {
    const cn = this.parseSubjectCN(subject);
    const match = cn.match(/:(\d{14})$/);
    return match?.[1] ?? null;
  }

  private formatarCnpjAudit(cnpj: string): string {
    const d = cnpj.replace(/\D/g, '').padStart(14, '0');
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private validateSession(envelope: { sessionToken: string | null; sessionExpiraEm: Date | null; status: StatusEnvelopeAssinatura }, sessionToken: string) {
    if (envelope.status !== StatusEnvelopeAssinatura.OTP_VALIDADO) {
      throw new ForbiddenException('Valide o OTP antes de assinar.');
    }
    if (!envelope.sessionToken || envelope.sessionToken !== sessionToken) {
      throw new ForbiddenException('Sessão de assinatura inválida.');
    }
    if (!envelope.sessionExpiraEm || envelope.sessionExpiraEm <= new Date()) {
      throw new ForbiddenException('Sessão de assinatura expirada.');
    }
  }

  private async concludeEnvelopeIfComplete(envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { documentos: true, candidatura: true },
    });
    if (!envelope) return;
    const complete = envelope.documentos.every((documento) => documento.status === StatusDocumentoAssinatura.ASSINADO);
    if (!complete) return;

    await this.prisma.envelopeAssinatura.update({
      where: { id: envelopeId },
      data: { status: StatusEnvelopeAssinatura.CONCLUIDO, concluidoEm: new Date() },
    });
    await this.recordEvent(envelopeId, TipoEventoAssinatura.ENVELOPE_CONCLUIDO, {});

    const pending = await this.prisma.envelopeAssinatura.count({
      where: { candidaturaId: envelope.candidaturaId, status: { not: StatusEnvelopeAssinatura.CONCLUIDO } },
    });
    if (pending === 0) {
      await this.certifyAndEmailSignedDocuments(envelope.candidaturaId);
      await this.prisma.requisicaoVaga.update({
        where: { id: envelope.candidatura.requisicaoId },
        data: { status: StatusRequisicaoVaga.AGUARDANDO_RH },
      });
    }
  }

  private async certifyEnvelopeDocuments(envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { candidatura: { include: { requisicao: true } }, documentos: { orderBy: { ordem: 'asc' } } },
    });
    if (!envelope) return;
    if (!envelope.candidatura.requisicao.empresaId) {
      throw new BadRequestException('Candidatura sem empresa para assinatura digital dos PDFs.');
    }

    const responsavelUser = envelope.geradoPorUserId
      ? await this.prisma.user.findUnique({
          where: { id: envelope.geradoPorUserId },
          select: { nome: true, cpf: true, email: true, role: true },
        })
      : null;

    const certificado = await this.certificados.getActiveCertificateForEmpresa(envelope.candidatura.requisicao.empresaId);
    for (const documento of envelope.documentos) {
      if (documento.status !== StatusDocumentoAssinatura.ASSINADO || documento.empresaPdfFinal) continue;
      await this.certifyDocument(documento, certificado, { user: responsavelUser });
    }
  }

  private async certifyAndEmailSignedDocuments(candidaturaId: number) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!candidatura) return;
    if (!candidatura.requisicao.empresaId) {
      throw new BadRequestException('Candidatura sem empresa para assinatura digital dos PDFs.');
    }

    // Busca o responsável RH que gerou os envelopes
    const geradoPorUserId = candidatura.envelopesAssinatura[0]?.geradoPorUserId ?? null;
    const responsavelUser = geradoPorUserId
      ? await this.prisma.user.findUnique({
          where: { id: geradoPorUserId },
          select: { nome: true, cpf: true, email: true, role: true },
        })
      : null;

    const certificado = await this.certificados.getActiveCertificateForEmpresa(candidatura.requisicao.empresaId);
    const documentos = candidatura.envelopesAssinatura.flatMap((envelope) => envelope.documentos);
    const attachments: { filename: string; content: Buffer }[] = [];

    for (const documento of documentos) {
      let pdfFinal: Buffer;
      if (documento.empresaPdfFinalStoragePath) {
        pdfFinal = await this.s3.download(documento.empresaPdfFinalStoragePath);
      } else if (documento.empresaPdfFinal) {
        pdfFinal = Buffer.from(documento.empresaPdfFinal);
      } else {
        pdfFinal = await this.certifyDocument(documento, certificado, { user: responsavelUser });
      }
      attachments.push({ filename: `${this.safeFilename(documento.nome)}.pdf`, content: pdfFinal });
    }

    if (!candidatura.candidato.email) {
      this.logger.warn(`Candidato ${candidatura.candidato.id} sem e-mail para receber documentos assinados.`);
      return;
    }

    await this.email.sendSignedDocuments(
      candidatura.candidato.email,
      candidatura.candidato.nome ?? 'candidato',
      candidatura.requisicao.empresa?.nome ?? 'empresa',
      attachments,
    );
  }

  private async certifyDocument(
    documento: Prisma.DocumentoAssinaturaGetPayload<Record<string, never>>,
    certificado: Awaited<ReturnType<EmpresaCertificadosService['getActiveCertificateForEmpresa']>>,
    responsavel?: { user: { nome: string | null; cpf: string | null; email: string | null; role: string } | null; evidence?: RequestEvidence },
  ) {
    const empresaAssinouEm = new Date();
    const empresaRepresentanteNome = responsavel?.user?.nome ?? this.parseSubjectCN(certificado.subject);
    const empresaRepresentanteCpf = responsavel?.user?.cpf ?? null;
    const empresaRepresentanteCargo = responsavel?.user?.role ?? null;
    const empresaRepresentanteEmail = responsavel?.user?.email ?? null;
    const empresaIp = responsavel?.evidence?.ip ?? null;
    const empresaUserAgent = responsavel?.evidence?.userAgent ?? null;

    const dadosEmpresa = {
      empresaCertSubject: certificado.subject,
      empresaCertIssuer: certificado.issuer,
      empresaCertSerial: certificado.serialNumber,
      empresaAssinouEm,
      empresaRepresentanteNome,
      empresaRepresentanteCpf,
      empresaRepresentanteCargo,
      empresaRepresentanteEmail,
      empresaIp,
      empresaUserAgent,
    };

    // Pass 1: renderiza sem hash para calcular o hash do documento
    const pdfPass1 = await this.renderDocumentoPdf({ ...documento, ...dadosEmpresa, empresaPdfHash: null });
    const empresaPdfHash = this.hashBuffer(pdfPass1);

    // Pass 2: renderiza com o hash real incluído na audit page
    const pdfPass2 = await this.renderDocumentoPdf({ ...documento, ...dadosEmpresa, empresaPdfHash });

    // Aplica a assinatura digital ICP-Brasil sobre o PDF com hash já visível
    const pdfFinalEmpresa = await this.pdfDigitalSignature.signWithPfx(
      pdfPass2,
      certificado.pfx,
      certificado.password,
    );

    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: documento.envelopeId },
      select: { candidatura: { select: { candidato: { select: { cpf: true } } } } },
    });
    const cpf = envelope?.candidatura?.candidato?.cpf ?? null;
    const finalKey = this.buildAssinaturaKey(cpf, documento.envelopeId, documento.codigo, 'final');
    await this.s3.upload(finalKey, pdfFinalEmpresa, 'application/pdf');

    await this.prisma.documentoAssinatura.update({
      where: { id: documento.id },
      data: {
        empresaCertificadoId: certificado.id,
        empresaAssinouEm,
        empresaCertSubject: certificado.subject,
        empresaCertIssuer: certificado.issuer,
        empresaCertSerial: certificado.serialNumber,
        empresaPdfHash,
        empresaPdfFinalStoragePath: finalKey,
        empresaRepresentanteNome,
        empresaRepresentanteCpf,
        empresaRepresentanteCargo,
        empresaRepresentanteEmail,
        empresaIp,
        empresaUserAgent,
      },
    });
    await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_CERTIFICADO_EMPRESA, {}, {
      documentoId: documento.id,
      empresaCertificadoId: certificado.id,
      empresaPdfHash,
      certificadoSubject: certificado.subject,
      certificadoIssuer: certificado.issuer,
      certificadoSerial: certificado.serialNumber,
      responsavelNome: empresaRepresentanteNome,
    });

    return pdfFinalEmpresa;
  }

  private async findEnvelopeForUser(userId: number, envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { candidatura: { include: { candidato: true } }, user: true },
    });
    if (!envelope || envelope.userId !== userId) throw new NotFoundException('Envelope não encontrado.');

    return envelope;
  }

  private async findDocumentForUser(userId: number, documentoId: number) {
    const documento = await this.prisma.documentoAssinatura.findUnique({
      where: { id: documentoId },
      include: {
        envelope: {
          include: {
            candidatura: { include: { candidato: true, requisicao: true } },
            user: true,
          },
        },
      },
    });
    if (!documento || documento.envelope.userId !== userId) {
      throw new NotFoundException('Documento de assinatura não encontrado.');
    }

    return documento;
  }

  private async ensureRh(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== Role.RH && user.role !== Role.ADMIN)) {
      throw new ForbiddenException('Acesso restrito ao RH.');
    }
  }

  private signatureIdentifier(candidato: { email: string | null; telefone: string | null }) {
    const identifier = candidato.email ?? candidato.telefone;
    if (!identifier) throw new BadRequestException('Candidato sem e-mail ou telefone para envio do OTP.');

    return identifier;
  }

  private async deliverOtp(identifier: string, code: string) {
    if (identifier.includes('@')) {
      await this.email.sendOtp(identifier, code);
      return;
    }

    await this.sms.sendOtp(identifier, code);
  }

  private recordEvent(envelopeId: number, tipo: TipoEventoAssinatura, evidence: RequestEvidence, metadata?: Prisma.InputJsonValue) {
    return this.prisma.eventoAssinatura.create({
      data: {
        envelopeId,
        tipo,
        ip: evidence.ip,
        userAgent: evidence.userAgent,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  private buildAssinaturaKey(cpf: string | null, envelopeId: number, codigo: string, suffix: string): string {
    const cpfSlug = (cpf ?? 'sem-cpf').replace(/\D/g, '');
    const safeCodigo = codigo.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `assinaturas/${cpfSlug}/${envelopeId}-${safeCodigo}-${suffix}.pdf`;
  }

  private hash(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private hashBuffer(value: Buffer) {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeFilename(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private generateVerificationCode() {
    return `AD-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async verificarPorCodigo(codigo: string) {
    const documento = await this.prisma.documentoAssinatura.findUnique({
      where: { codigoVerificacao: codigo },
      include: {
        envelope: {
          include: {
            candidatura: { include: { candidato: true, requisicao: { include: { empresa: true } } } },
          },
        },
        // Join para obter validade do certificado
        empresaCertificado: true,
      },
    });
    if (!documento) throw new NotFoundException('Código de verificação não encontrado.');

    const empresa = documento.envelope.candidatura.requisicao.empresa;
    const integro = !!(documento.hashAssinado && documento.empresaPdfHash);

    return {
      autenticidade: 'Documento autêntico verificado pelo sistema Admissão Digital',
      codigoVerificacao: documento.codigoVerificacao,
      nomeDocumento: documento.nome,
      statusDocumento: documento.status,

      integridade: {
        status: integro ? 'INTEGRO' : 'PARCIAL',
        descricao: integro
          ? 'Documento íntegro — todos os hashes foram calculados e registrados'
          : 'Assinatura parcial — certificação da empresa ainda não concluída',
      },

      colaborador: {
        nome: documento.assinaturaNome ?? 'Não informado',
        cpfMascarado: documento.assinaturaCpf ? this.maskCpf(documento.assinaturaCpf) : null,
        metodoAssinatura: documento.metodoAssinatura,
        assinadoEm: documento.assinadoEm?.toISOString() ?? null,
        assinadoEmBrasilia: documento.assinadoEm ? this.formatDateBrasilia(documento.assinadoEm) : null,
        ip: documento.assinaturaIp ?? null,
      },

      empresa: documento.empresaAssinouEm
        ? {
            nome: empresa?.nome ?? null,
            cnpj: documento.empresaCertSubject ? this.formatarCnpjAudit(this.parseSubjectCnpj(documento.empresaCertSubject) ?? '') || null : null,
            metodo: 'Assinatura digital com certificado A1 ICP-Brasil',
            certificadoSubject: documento.empresaCertSubject ?? null,
            emissor: documento.empresaCertIssuer ?? null,
            serial: documento.empresaCertSerial ?? null,
            certValidoDe: documento.empresaCertificado?.validoDe?.toISOString() ?? null,
            certValidoAte: documento.empresaCertificado?.validoAte?.toISOString() ?? null,
            assinouEm: documento.empresaAssinouEm.toISOString(),
            assinouEmBrasilia: this.formatDateBrasilia(documento.empresaAssinouEm),
            responsavel: {
              nome: documento.empresaRepresentanteNome ?? null,
              cargo: documento.empresaRepresentanteCargo ?? null,
              email: documento.empresaRepresentanteEmail ?? null,
              ip: documento.empresaIp ?? null,
              userAgent: documento.empresaUserAgent ?? null,
            },
          }
        : null,

      hashes: {
        original: documento.hashOriginal,
        aposAssinaturaColaborador: documento.hashAssinado ?? null,
        documentoPrecertificacao: documento.empresaPdfHash ?? null,
      },
    };
  }

  private maskIdentifier(identifier: string) {
    if (identifier.includes('@')) {
      const [name, domain] = identifier.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }

    return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
  }
}
