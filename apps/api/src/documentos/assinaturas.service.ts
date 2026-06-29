import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  MetodoAssinatura,
  Role,
  SetorAssinatura,
  StatusDocumentoAdmissao,
  StatusDocumentoAssinatura,
  StatusEnvelopeAssinatura,
  StatusRequisicaoVaga,
  TipoEventoAssinatura,
} from '@prisma/client';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { EmailService } from '../auth/email.service';
import { OtpService } from '../auth/otp.service';
import { SmsService } from '../auth/sms.service';
import { DocumentosTemplatesService } from '../documentos-templates/documentos-templates.service';
import { drawHeader, wrapText } from '../documentos-templates/pdf-render.utils';
import { EmpresaCertificadosService } from '../empresas/empresa-certificados.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentosService } from './documentos.service';
import { PdfDigitalSignatureService } from './pdf-digital-signature.service';

type RequestEvidence = { ip?: string; userAgent?: string };

const assinaturaTemplates = {
  [SetorAssinatura.ADM_PESSOAL]: [
    ['contrato-experiencia', 'Contrato de Experiência'],
    ['declaracao-treinamento-biometrico', 'Declaração de Treinamento - Registro Eletrônico Biométrico'],
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

    await this.ensureEnvelopes(candidatura.id, candidatura.candidato.userId);

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
    if (documento.empresaPdfFinal) return Buffer.from(documento.empresaPdfFinal);

    return this.renderDocumentoPdf(documento);
  }

  async signDocument(userId: number, documentoId: number, sessionToken: string, evidence: RequestEvidence) {
    const documento = await this.findDocumentForUser(userId, documentoId);
    if (documento.status === StatusDocumentoAssinatura.ASSINADO) return documento;
    if (!documento.visualizadoEm) throw new BadRequestException('Visualize o documento antes de assinar.');

    this.validateSession(documento.envelope, sessionToken);

    const candidato = documento.envelope.candidatura.candidato;
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

  private async ensureEnvelopes(candidaturaId: number, userId: number) {
    for (const setor of Object.values(SetorAssinatura)) {
      const templates = assinaturaTemplates[setor];
      if (templates.length === 0) continue;

      const envelope = await this.prisma.envelopeAssinatura.upsert({
        where: { candidaturaId_setor: { candidaturaId, setor } },
        create: { candidaturaId, userId, setor },
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
    const templates = assinaturaTemplates[setor];
    await Promise.all(
      templates.map(async ([codigo, nome], index) => {
        const pdfBuffer = await this.documentosTemplates.gerarPdf(codigo, candidaturaId);
        const conteudo = pdfBuffer.toString('base64');
        return this.prisma.documentoAssinatura.upsert({
          where: { envelopeId_codigo: { envelopeId, codigo } },
          create: {
            envelopeId,
            codigo,
            nome,
            descricao: `Documento de assinatura eletrônica avançada do setor ${setor}.`,
            ordem: index + 1,
            conteudo,
            hashOriginal: this.hash(conteudo),
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
    conteudo: string;
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
  }): Promise<Buffer> {
    if (this.isBase64Pdf(documento.conteudo)) {
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

    const [title, ...body] = documento.conteudo.split('\n');
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

  private isBase64Pdf(conteudo: string): boolean {
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
    },
  ) {
    const page = pdf.addPage([595.28, 841.89]);
    let cursorY = drawHeader(page, bold);
    page.drawText('Comprovante de assinatura eletrônica avançada', { x: 70, y: cursorY, size: 14, font: bold });
    cursorY -= 34;

    const rows = [
      ['Método', documento.metodoAssinatura === MetodoAssinatura.BIOMETRIA ? 'Assinatura biométrica assistida' : 'Assinatura eletrônica por OTP'],
      ['Assinado por', documento.assinaturaNome ?? 'Não informado'],
      ['CPF', documento.assinaturaCpf ?? 'Não informado'],
      ['Data/hora', documento.assinadoEm?.toISOString() ?? 'Não informado'],
      ['IP', documento.assinaturaIp ?? 'Não informado'],
      ['Dispositivo', documento.assinaturaUserAgent ?? 'Não informado'],
      ['Código de verificação', documento.codigoVerificacao ?? 'Não informado'],
      ['Hash original SHA-256', documento.hashOriginal],
    ];

    for (const [label, value] of rows) {
      page.drawText(`${label}:`, { x: 70, y: cursorY, size: 10, font: bold });
      cursorY -= 14;
      for (const line of wrapText(value, regular, 9, 455)) {
        page.drawText(line, { x: 86, y: cursorY, size: 9, font: regular });
        cursorY -= 12;
      }
      cursorY -= 8;
    }
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

    const certificado = await this.certificados.getActiveCertificateForEmpresa(envelope.candidatura.requisicao.empresaId);
    for (const documento of envelope.documentos) {
      if (documento.status !== StatusDocumentoAssinatura.ASSINADO || documento.empresaPdfFinal) continue;
      await this.certifyDocument(documento, certificado);
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

    const certificado = await this.certificados.getActiveCertificateForEmpresa(candidatura.requisicao.empresaId);
    const documentos = candidatura.envelopesAssinatura.flatMap((envelope) => envelope.documentos);
    const attachments: { filename: string; content: Buffer }[] = [];

    for (const documento of documentos) {
      const pdfFinal = documento.empresaPdfFinal
        ? Buffer.from(documento.empresaPdfFinal)
        : await this.certifyDocument(documento, certificado);
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
  ) {
    const pdfCandidato = await this.renderDocumentoPdf(documento);
    const pdfFinalEmpresa = await this.pdfDigitalSignature.signWithPfx(
      pdfCandidato,
      certificado.pfx,
      certificado.password,
    );
    const empresaPdfHash = this.hashBuffer(pdfFinalEmpresa);

    await this.prisma.documentoAssinatura.update({
      where: { id: documento.id },
      data: {
        empresaCertificadoId: certificado.id,
        empresaAssinouEm: new Date(),
        empresaCertSubject: certificado.subject,
        empresaCertIssuer: certificado.issuer,
        empresaCertSerial: certificado.serialNumber,
        empresaPdfHash,
        empresaPdfFinal: pdfFinalEmpresa,
      },
    });
    await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_CERTIFICADO_EMPRESA, {}, {
      documentoId: documento.id,
      empresaCertificadoId: certificado.id,
      empresaPdfHash,
      certificadoSubject: certificado.subject,
      certificadoIssuer: certificado.issuer,
      certificadoSerial: certificado.serialNumber,
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

  private maskIdentifier(identifier: string) {
    if (identifier.includes('@')) {
      const [name, domain] = identifier.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }

    return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
  }
}
