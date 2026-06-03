import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BiometriaStatus,
  ResultadoBiometriaSolicitacao,
  Role,
  StatusBiometriaSolicitacao,
  StatusDocumentoAssinatura,
  TipoBiometriaSolicitacao,
} from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssinaturasService } from '../documentos/assinaturas.service';
import { ResultadoBiometriaDto } from './dto/resultado-biometria.dto';

type RequestEvidence = { ip?: string; userAgent?: string };

@Injectable()
export class BiometriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assinaturas: AssinaturasService,
  ) {}

  async saveTemplate(token: string, candidatoId: number, templateBase64: string) {
    await this.authenticateDispositivo(token);
    const candidato = await this.prisma.candidato.findUnique({ where: { id: candidatoId } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado.');

    const template = Buffer.from(templateBase64, 'base64');
    return this.prisma.biometriaTemplate.create({
      data: { candidatoId, template },
      select: { id: true, candidatoId: true, criadoEm: true },
    });
  }

  async getTemplates(token: string, candidatoId: number) {
    await this.authenticateDispositivo(token);
    const candidato = await this.prisma.candidato.findUnique({ where: { id: candidatoId } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado.');

    const templates = await this.prisma.biometriaTemplate.findMany({
      where: { candidatoId },
      orderBy: { criadoEm: 'asc' },
    });

    return templates.map((t) => ({
      id: t.id,
      candidatoId: t.candidatoId,
      template: Buffer.from(t.template).toString('base64'),
      criadoEm: t.criadoEm,
    }));
  }

  async listDispositivos(userId: number) {
    await this.ensureRh(userId);
    return this.prisma.biometriaDispositivo.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDispositivo(userId: number, nome: string) {
    await this.ensureRh(userId);
    const token = `bio_${randomBytes(32).toString('hex')}`;
    const dispositivo = await this.prisma.biometriaDispositivo.create({
      data: { nome: nome.trim(), tokenHash: this.hash(token) },
    });

    return { dispositivo, token };
  }

  async solicitarCadastro(userId: number, candidatoId: number) {
    await this.ensureRh(userId);
    const candidato = await this.prisma.candidato.findUnique({ where: { id: candidatoId } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado.');

    return this.createSolicitacao({
      tipo: TipoBiometriaSolicitacao.CADASTRO,
      candidatoId,
      solicitadaPorId: userId,
    });
  }

  async solicitarAssinatura(userId: number, envelopeId: number) {
    await this.ensureRh(userId);
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: {
        candidatura: { include: { candidato: true } },
        documentos: true,
      },
    });
    if (!envelope) throw new NotFoundException('Envelope não encontrado.');
    if (envelope.documentos.every((documento) => documento.status === StatusDocumentoAssinatura.ASSINADO)) {
      throw new BadRequestException('Envelope já está assinado.');
    }
    if (envelope.candidatura.candidato.biometriaStatus !== BiometriaStatus.CADASTRADA) {
      throw new BadRequestException('Cadastre a biometria do candidato antes de solicitar assinatura biométrica.');
    }

    return this.createSolicitacao({
      tipo: TipoBiometriaSolicitacao.VERIFICACAO_ASSINATURA,
      candidatoId: envelope.candidatura.candidatoId,
      candidaturaId: envelope.candidaturaId,
      envelopeId,
      solicitadaPorId: userId,
    });
  }

  async listSolicitacoesRh(userId: number, candidatoId?: number) {
    await this.ensureRh(userId);
    return this.prisma.biometriaSolicitacao.findMany({
      where: candidatoId ? { candidatoId } : undefined,
      include: { candidato: true, dispositivo: true, solicitadaPor: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listPendentesForDispositivo(token: string) {
    const dispositivo = await this.authenticateDispositivo(token);
    await this.expireOldSolicitacoes();

    return this.prisma.biometriaSolicitacao.findMany({
      where: { status: StatusBiometriaSolicitacao.PENDENTE, expiraEm: { gt: new Date() } },
      include: {
        candidato: true,
        envelope: true,
        candidatura: { include: { requisicao: { include: { empresa: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }).finally(() => this.touchDispositivo(dispositivo.id));
  }

  async assumirSolicitacao(token: string, solicitacaoId: number) {
    const dispositivo = await this.authenticateDispositivo(token);
    await this.expireOldSolicitacoes();

    const updated = await this.prisma.biometriaSolicitacao.updateMany({
      where: {
        id: solicitacaoId,
        status: StatusBiometriaSolicitacao.PENDENTE,
        expiraEm: { gt: new Date() },
      },
      data: {
        status: StatusBiometriaSolicitacao.EM_ATENDIMENTO,
        dispositivoId: dispositivo.id,
        assumidaEm: new Date(),
      },
    });
    if (updated.count === 0) throw new BadRequestException('Solicitação não está disponível para atendimento.');

    await this.touchDispositivo(dispositivo.id);
    return this.prisma.biometriaSolicitacao.findUnique({
      where: { id: solicitacaoId },
      include: { candidato: true, envelope: true },
    });
  }

  async registrarResultado(token: string, solicitacaoId: number, dto: ResultadoBiometriaDto, evidence: RequestEvidence) {
    const dispositivo = await this.authenticateDispositivo(token);
    const solicitacao = await this.prisma.biometriaSolicitacao.findUnique({
      where: { id: solicitacaoId },
      include: { candidato: true },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação biométrica não encontrada.');
    if (solicitacao.dispositivoId !== dispositivo.id) throw new ForbiddenException('Solicitação assumida por outro dispositivo.');
    if (solicitacao.status !== StatusBiometriaSolicitacao.EM_ATENDIMENTO) {
      throw new BadRequestException('Solicitação não está em atendimento.');
    }
    if (solicitacao.expiraEm <= new Date()) {
      await this.prisma.biometriaSolicitacao.update({
        where: { id: solicitacao.id },
        data: { status: StatusBiometriaSolicitacao.EXPIRADA },
      });
      throw new BadRequestException('Solicitação expirada.');
    }

    const status = this.statusFromResultado(dto.resultado);
    const cpfRetornado = dto.cpfRetornado?.replace(/\D/g, '') || null;
    const payloadHash = this.hash(JSON.stringify({ solicitacaoId, ...dto }));
    const concluidaEm = new Date();

    const updated = await this.prisma.biometriaSolicitacao.update({
      where: { id: solicitacao.id },
      data: {
        status,
        resultado: dto.resultado,
        cpfRetornado,
        score: dto.score,
        identificadorExterno: dto.identificadorExterno?.trim() || null,
        mensagem: dto.mensagem?.trim() || null,
        ipResultado: evidence.ip,
        userAgentResultado: evidence.userAgent,
        payloadHash,
        concluidaEm,
      },
    });

    if (dto.resultado !== ResultadoBiometriaSolicitacao.APROVADO) return updated;
    if (cpfRetornado && cpfRetornado !== solicitacao.candidato.cpf.replace(/\D/g, '')) {
      await this.prisma.biometriaSolicitacao.update({
        where: { id: solicitacao.id },
        data: { status: StatusBiometriaSolicitacao.REPROVADA, mensagem: 'CPF retornado não confere com o candidato.' },
      });
      throw new BadRequestException('CPF retornado não confere com o candidato.');
    }

    if (solicitacao.tipo === TipoBiometriaSolicitacao.CADASTRO) {
      return this.prisma.candidato.update({
        where: { id: solicitacao.candidatoId },
        data: {
          biometriaStatus: BiometriaStatus.CADASTRADA,
          biometriaCadastradaEm: concluidaEm,
          biometriaIdentificadorExterno: dto.identificadorExterno?.trim() || null,
        },
      }).then(() => updated);
    }

    if (!solicitacao.envelopeId) throw new BadRequestException('Solicitação sem envelope para assinatura.');
    await this.assinaturas.signEnvelopeByBiometria(solicitacao.envelopeId, solicitacao.id, {
      ip: evidence.ip,
      userAgent: evidence.userAgent,
    });
    return updated;
  }

  private createSolicitacao(data: {
    tipo: TipoBiometriaSolicitacao;
    candidatoId: number;
    candidaturaId?: number;
    envelopeId?: number;
    solicitadaPorId: number;
  }) {
    return this.prisma.biometriaSolicitacao.create({
      data: { ...data, expiraEm: new Date(Date.now() + 15 * 60 * 1000) },
    });
  }

  private async ensureRh(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== Role.RH && user.role !== Role.ADMIN)) {
      throw new ForbiddenException('Acesso restrito ao RH.');
    }
  }

  private async authenticateDispositivo(token: string) {
    if (!token) throw new ForbiddenException('Token de dispositivo não informado.');
    const dispositivo = await this.prisma.biometriaDispositivo.findUnique({ where: { tokenHash: this.hash(token) } });
    if (!dispositivo?.ativo) throw new ForbiddenException('Dispositivo biométrico não autorizado.');
    return dispositivo;
  }

  private touchDispositivo(id: number) {
    return this.prisma.biometriaDispositivo.update({ where: { id }, data: { ultimoPingEm: new Date() } });
  }

  private expireOldSolicitacoes() {
    return this.prisma.biometriaSolicitacao.updateMany({
      where: { status: StatusBiometriaSolicitacao.PENDENTE, expiraEm: { lte: new Date() } },
      data: { status: StatusBiometriaSolicitacao.EXPIRADA },
    });
  }

  private statusFromResultado(resultado: ResultadoBiometriaSolicitacao) {
    if (resultado === ResultadoBiometriaSolicitacao.APROVADO) return StatusBiometriaSolicitacao.CONCLUIDA;
    if (resultado === ResultadoBiometriaSolicitacao.REPROVADO) return StatusBiometriaSolicitacao.REPROVADA;
    return StatusBiometriaSolicitacao.FALHOU;
  }

  private hash(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
