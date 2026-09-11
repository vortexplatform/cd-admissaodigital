import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import {
  Prisma,
  Role,
  SetorAssinatura,
  StatusAssinaturaPresencial,
  StatusDocumentoAssinatura,
  TipoEventoAssinatura,
  TipoSignatario,
} from '@prisma/client';
import { AssinaturasService } from './assinaturas.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from './s3-storage.service';
import { PosicaoAssinaturaPresencialDto } from './dto/assinatura-presencial.dto';

type Evidence = { ip?: string; userAgent?: string };
type UploadedMemoryFile = { buffer: Buffer; mimetype: string; size: number };
type DocumentoPendente = {
  id: number;
  envelopeId: number;
  codigo: string;
  nome: string;
  status: StatusDocumentoAssinatura;
  responsavelAssinadoEm: Date | null;
  conteudoStoragePath: string | null;
  presencialPdfStoragePath: string | null;
};

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_SIGNATURE_BYTES = 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AssinaturaPresencialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService,
    private readonly assinaturas: AssinaturasService,
  ) {}

  async iniciar(userId: number, envelopeId: number, evidence: Evidence) {
    await this.ensureRh(userId);
    const envelope = await this.getEnvelope(envelopeId);
    this.ensureEnvelopePendente(envelope);
    await this.assinaturas.regenerarDocumentosPendentesParaAssinaturaPresencial(envelopeId);

    await this.expirarSessoes(envelopeId);
    const existente = await this.prisma.assinaturaPresencial.findFirst({
      where: {
        envelopeId,
        status: StatusAssinaturaPresencial.EM_ANDAMENTO,
        expiraEm: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existente) return this.getSession(userId, existente.id);

    const sessao = await this.prisma.assinaturaPresencial.create({
      data: {
        envelopeId,
        iniciadaPorId: userId,
        tipoSignatario: envelope.tipoSignatario,
        expiraEm: new Date(Date.now() + SESSION_DURATION_MS),
        ip: evidence.ip,
        userAgent: evidence.userAgent,
      },
    });
    await this.recordEvent(
      envelopeId,
      TipoEventoAssinatura.ASSINATURA_PRESENCIAL_INICIADA,
      evidence,
      {
        sessaoId: sessao.id,
        iniciadoPorId: userId,
      },
    );
    return this.getSession(userId, sessao.id);
  }

  async getSession(userId: number, sessionId: number) {
    await this.ensureRh(userId);
    const sessao = await this.prisma.assinaturaPresencial.findUnique({
      where: { id: sessionId },
      include: {
        envelope: {
          include: {
            candidatura: { include: { candidato: true } },
            documentos: { orderBy: { ordem: 'asc' } },
          },
        },
        documentos: true,
      },
    });
    if (!sessao) throw new NotFoundException('Sessão presencial não encontrada.');
    await this.expirarSessao(sessao);
    const documentos = await this.documentosPendentes(sessao.envelope, sessao.tipoSignatario);
    const assinados = new Set(sessao.documentos.map((item) => item.documentoId));

    return {
      id: sessao.id,
      status: sessao.status,
      expiraEm: sessao.expiraEm,
      fotoCapturada: Boolean(sessao.fotoStoragePath),
      tipoSignatario: sessao.tipoSignatario,
      signatarioNome:
        sessao.tipoSignatario === TipoSignatario.RESPONSAVEL
          ? sessao.envelope.candidatura.candidato.responsavelNome
          : sessao.envelope.candidatura.candidato.nome,
      documentos: documentos.map((documento) => ({
        id: documento.id,
        nome: documento.nome,
        status: assinados.has(documento.id) ? 'ASSINADO_NA_SESSAO' : 'PENDENTE',
      })),
    };
  }

  async salvarAssinatura(
    userId: number,
    sessionId: number,
    documentoId: number,
    posicao: PosicaoAssinaturaPresencialDto,
    file: UploadedMemoryFile | undefined,
    evidence: Evidence,
  ) {
    const sessao = await this.getActiveSession(userId, sessionId);
    this.ensureImage(file, 'image/png', MAX_SIGNATURE_BYTES, 'assinatura');
    const documentos = await this.documentosPendentes(sessao.envelope, sessao.tipoSignatario);
    if (!documentos.some((documento) => documento.id === documentoId)) {
      throw new ForbiddenException('Documento não pertence a esta sessão presencial.');
    }
    if (posicao.x + posicao.largura > 1 || posicao.y + posicao.altura > 1) {
      throw new BadRequestException('A assinatura deve permanecer dentro dos limites da página.');
    }

    const key = `assinaturas/presencial/${sessionId}/documento-${documentoId}.png`;
    await this.s3.upload(key, file.buffer, file.mimetype);
    await this.prisma.assinaturaPresencialDocumento.upsert({
      where: { assinaturaId_documentoId: { assinaturaId: sessionId, documentoId } },
      create: { assinaturaId: sessionId, documentoId, assinaturaStoragePath: key, ...posicao },
      update: { assinaturaStoragePath: key, ...posicao },
    });
    await this.recordEvent(
      sessao.envelopeId,
      TipoEventoAssinatura.DOCUMENTO_ASSINADO_PRESENCIAL,
      evidence,
      {
        sessaoId: sessionId,
        documentoId,
        pagina: posicao.pagina,
      },
    );
    return this.getSession(userId, sessionId);
  }

  async salvarFoto(
    userId: number,
    sessionId: number,
    file: UploadedMemoryFile | undefined,
    evidence: Evidence,
  ) {
    const sessao = await this.getActiveSession(userId, sessionId);
    this.ensureImage(file, undefined, MAX_PHOTO_BYTES, 'foto');
    const documentos = await this.documentosPendentes(sessao.envelope, sessao.tipoSignatario);
    const evidencias = await this.prisma.assinaturaPresencialDocumento.count({
      where: { assinaturaId: sessionId },
    });
    if (evidencias !== documentos.length)
      throw new BadRequestException('Assine todos os documentos antes de tirar a foto.');

    const extension = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const key = `assinaturas/presencial/${sessionId}/foto.${extension}`;
    await this.s3.upload(key, file.buffer, file.mimetype);
    await this.prisma.assinaturaPresencial.update({
      where: { id: sessionId },
      data: { fotoStoragePath: key, fotoMimeType: file.mimetype, fotoCapturadaEm: new Date() },
    });
    await this.recordEvent(
      sessao.envelopeId,
      TipoEventoAssinatura.FOTO_ASSINATURA_PRESENCIAL_CAPTURADA,
      evidence,
      { sessaoId: sessionId },
    );
    return this.getSession(userId, sessionId);
  }

  async concluir(userId: number, sessionId: number, evidence: Evidence) {
    const sessao = await this.getActiveSession(userId, sessionId);
    if (!sessao.fotoStoragePath || !sessao.fotoMimeType)
      throw new BadRequestException('Capture a foto antes de concluir.');
    const documentos = await this.documentosPendentes(sessao.envelope, sessao.tipoSignatario);
    const evidencias = await this.prisma.assinaturaPresencialDocumento.findMany({
      where: { assinaturaId: sessionId },
    });
    if (evidencias.length !== documentos.length)
      throw new BadRequestException('Todos os documentos precisam ser assinados.');

    const lock = await this.prisma.assinaturaPresencial.updateMany({
      where: { id: sessionId, status: StatusAssinaturaPresencial.EM_ANDAMENTO },
      data: { status: StatusAssinaturaPresencial.FINALIZANDO },
    });
    if (lock.count === 0) throw new BadRequestException('A sessão já está sendo concluída.');

    try {
      for (const documento of documentos) {
        const assinatura = evidencias.find((item) => item.documentoId === documento.id);
        if (!assinatura) throw new BadRequestException('Assinatura de documento ausente.');
        const pdfAssinado = await this.aplicarEvidencias(documento, assinatura);
        const key = this.buildDocumentoAssinadoKey(
          sessao.envelope.candidatura.candidato.cpf,
          documento.envelopeId,
          documento.codigo,
        );
        await this.s3.upload(key, pdfAssinado, 'application/pdf');
        await this.prisma.documentoAssinatura.update({
          where: { id: documento.id },
          data: {
            presencialPdfStoragePath: key,
            ...(sessao.tipoSignatario === TipoSignatario.RESPONSAVEL
              ? { responsavelPresencialFotoStoragePath: sessao.fotoStoragePath }
              : { presencialFotoStoragePath: sessao.fotoStoragePath }),
          },
        });
      }

      await this.assinaturas.concluirAssinaturaPresencial(
        sessao.envelopeId,
        sessao.tipoSignatario,
        evidence,
      );
      await this.prisma.assinaturaPresencial.update({
        where: { id: sessionId },
        data: { status: StatusAssinaturaPresencial.CONCLUIDA, concluidaEm: new Date() },
      });
      await this.recordEvent(
        sessao.envelopeId,
        TipoEventoAssinatura.ASSINATURA_PRESENCIAL_CONCLUIDA,
        evidence,
        { sessaoId: sessionId },
      );
      return { concluida: true };
    } catch (err) {
      await this.prisma.assinaturaPresencial.update({
        where: { id: sessionId },
        data: { status: StatusAssinaturaPresencial.EM_ANDAMENTO },
      });
      throw err;
    }
  }

  private async aplicarEvidencias(
    documento: { conteudoStoragePath: string | null; presencialPdfStoragePath: string | null },
    assinatura: {
      assinaturaStoragePath: string;
      pagina: number;
      x: number;
      y: number;
      largura: number;
      altura: number;
    },
  ) {
    const source = documento.presencialPdfStoragePath ?? documento.conteudoStoragePath;
    if (!source) throw new BadRequestException('PDF original do documento não encontrado.');
    const pdf = await PDFDocument.load(await this.s3.download(source));
    const page = pdf.getPages()[assinatura.pagina - 1];
    if (!page) throw new BadRequestException('Página da assinatura não existe no PDF.');
    const signature = await pdf.embedPng(await this.s3.download(assinatura.assinaturaStoragePath));
    const { width, height } = page.getSize();
    page.drawImage(signature, {
      x: assinatura.x * width,
      y: height - (assinatura.y + assinatura.altura) * height,
      width: assinatura.largura * width,
      height: assinatura.altura * height,
    });

    return Buffer.from(await pdf.save());
  }

  private buildDocumentoAssinadoKey(cpf: string | null, envelopeId: number, codigo: string) {
    const cpfSlug = (cpf ?? 'sem-cpf').replace(/\D/g, '');
    const safeCodigo = codigo.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `assinaturas/${cpfSlug}/${envelopeId}-${safeCodigo}-presencial.pdf`;
  }

  private async getActiveSession(userId: number, sessionId: number) {
    await this.ensureRh(userId);
    const sessao = await this.prisma.assinaturaPresencial.findUnique({
      where: { id: sessionId },
      include: {
        envelope: {
          include: {
            candidatura: { include: { candidato: true } },
            documentos: { orderBy: { ordem: 'asc' } },
          },
        },
      },
    });
    if (!sessao) throw new NotFoundException('Sessão presencial não encontrada.');
    await this.expirarSessao(sessao);
    if (
      sessao.status !== StatusAssinaturaPresencial.EM_ANDAMENTO ||
      sessao.expiraEm <= new Date()
    ) {
      throw new BadRequestException('Sessão presencial expirada ou concluída.');
    }
    return sessao;
  }

  private async getEnvelope(envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { candidatura: { include: { candidato: true } }, documentos: true },
    });
    if (!envelope) throw new NotFoundException('Envelope não encontrado.');
    return envelope;
  }

  private async documentosPendentes(
    envelope: { candidaturaId: number; setor: SetorAssinatura; documentos?: DocumentoPendente[] },
    tipo: TipoSignatario,
  ): Promise<DocumentoPendente[]> {
    if (tipo === TipoSignatario.CANDIDATO) {
      return (envelope.documentos ?? []).filter(
        (documento) => documento.status !== StatusDocumentoAssinatura.ASSINADO,
      );
    }
    return this.prisma.documentoAssinatura.findMany({
      where: {
        envelope: {
          candidaturaId: envelope.candidaturaId,
          setor: envelope.setor,
          tipoSignatario: TipoSignatario.CANDIDATO,
        },
        status: StatusDocumentoAssinatura.ASSINADO,
        responsavelAssinadoEm: null,
      },
      orderBy: { ordem: 'asc' },
    });
  }

  private ensureEnvelopePendente(envelope: {
    tipoSignatario: TipoSignatario;
    documentos: { status: StatusDocumentoAssinatura }[];
  }) {
    if (
      envelope.tipoSignatario === TipoSignatario.CANDIDATO &&
      envelope.documentos.every(
        (documento) => documento.status === StatusDocumentoAssinatura.ASSINADO,
      )
    ) {
      throw new BadRequestException('Envelope já está concluído.');
    }
  }

  private ensureImage(
    file: UploadedMemoryFile | undefined,
    mimeType: string | undefined,
    maxSize: number,
    label: string,
  ): asserts file is UploadedMemoryFile {
    if (!file?.buffer?.length) throw new BadRequestException(`Envie a ${label}.`);
    if (
      (mimeType && file.mimetype !== mimeType) ||
      (!mimeType && !['image/jpeg', 'image/png'].includes(file.mimetype))
    ) {
      throw new BadRequestException(`Formato da ${label} inválido.`);
    }
    if (file.size > maxSize)
      throw new BadRequestException(
        `${label[0].toUpperCase()}${label.slice(1)} excede o tamanho permitido.`,
      );
  }

  private async ensureRh(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || (user.role !== Role.RH && user.role !== Role.ADMIN))
      throw new ForbiddenException('Acesso restrito ao RH.');
  }

  private async expirarSessoes(envelopeId: number) {
    await this.prisma.assinaturaPresencial.updateMany({
      where: {
        envelopeId,
        status: StatusAssinaturaPresencial.EM_ANDAMENTO,
        expiraEm: { lte: new Date() },
      },
      data: { status: StatusAssinaturaPresencial.EXPIRADA },
    });
  }

  private async expirarSessao(sessao: {
    id: number;
    status: StatusAssinaturaPresencial;
    expiraEm: Date;
  }) {
    if (
      sessao.status === StatusAssinaturaPresencial.EM_ANDAMENTO &&
      sessao.expiraEm <= new Date()
    ) {
      await this.prisma.assinaturaPresencial.update({
        where: { id: sessao.id },
        data: { status: StatusAssinaturaPresencial.EXPIRADA },
      });
    }
  }

  private recordEvent(
    envelopeId: number,
    tipo: TipoEventoAssinatura,
    evidence: Evidence,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.prisma.eventoAssinatura.create({
      data: { envelopeId, tipo, ip: evidence.ip, userAgent: evidence.userAgent, metadata },
    });
  }
}
