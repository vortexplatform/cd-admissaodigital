import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ResultadoBiometriaSolicitacao,
  Role,
  StatusBiometriaSolicitacao,
  StatusDocumentoAssinatura,
  StatusEnvelopeAssinatura,
  TipoBiometriaSolicitacao,
  TipoSignatario,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssinaturasService } from '../documentos/assinaturas.service';
import { SeniorApiService } from '../general/senior-api.service';
import { ResultadoBiometriaDto } from './dto/resultado-biometria.dto';

type RequestEvidence = { ip?: string; userAgent?: string };

@Injectable()
export class BiometriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assinaturas: AssinaturasService,
    private readonly seniorApi: SeniorApiService,
  ) {}

  async solicitarAssinatura(userId: number, envelopeId: number, idfaceIp: string) {
    await this.ensureRh(userId);
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: {
        candidatura: { include: { candidato: true } },
        documentos: true,
      },
    });
    if (!envelope) throw new NotFoundException('Envelope não encontrado.');
    if (
      envelope.documentos.every(
        (documento) => documento.status === StatusDocumentoAssinatura.ASSINADO,
      )
    ) {
      throw new BadRequestException('Envelope já está assinado.');
    }
    await this.ensureIdfaceDisponivel(idfaceIp);
    return this.createSolicitacao({
      tipo: TipoBiometriaSolicitacao.VERIFICACAO_ASSINATURA,
      candidatoId: envelope.candidatura.candidatoId,
      candidaturaId: envelope.candidaturaId,
      envelopeId,
      solicitadaPorId: userId,
      idfaceIp,
    });
  }

  async solicitarAssinaturaResponsavel(userId: number, envelopeId: number, idfaceIp: string) {
    await this.ensureRh(userId);
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { candidatura: { include: { candidato: true } } },
    });
    if (!envelope) throw new NotFoundException('Envelope não encontrado.');
    if (envelope.tipoSignatario !== TipoSignatario.RESPONSAVEL) {
      throw new BadRequestException('Envelope não é do responsável legal.');
    }

    // Garante que todos os envelopes do candidato foram concluídos
    const pendingCandidato = await this.prisma.envelopeAssinatura.count({
      where: {
        candidaturaId: envelope.candidaturaId,
        tipoSignatario: TipoSignatario.CANDIDATO,
        status: { not: StatusEnvelopeAssinatura.CONCLUIDO },
      },
    });
    if (pendingCandidato > 0) {
      throw new BadRequestException('O candidato ainda não assinou todos os documentos.');
    }

    // Verifica se já tem todos os documentos assinados pelo responsável
    const pendingDocs = await this.prisma.documentoAssinatura.count({
      where: {
        envelope: { candidaturaId: envelope.candidaturaId, tipoSignatario: TipoSignatario.CANDIDATO },
        responsavelAssinadoEm: null,
      },
    });
    if (pendingDocs === 0) {
      throw new BadRequestException('Todos os documentos já foram assinados pelo responsável legal.');
    }

    await this.ensureIdfaceDisponivel(idfaceIp);
    return this.createSolicitacao({
      tipo: TipoBiometriaSolicitacao.VERIFICACAO_ASSINATURA,
      candidatoId: envelope.candidatura.candidatoId,
      candidaturaId: envelope.candidaturaId,
      envelopeId,
      solicitadaPorId: userId,
      idfaceIp,
    });
  }

  async listIdfaces(userId: number) {
    await this.ensureRh(userId);
    return this.seniorApi.get<
      { codplt: number; codrlg: number; desrlg: string; coddsp: number; ip: string }[]
    >('/controlid-idface/dispositivos?modrlg=17');
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

  async getSolicitacaoRh(userId: number, solicitacaoId: number) {
    await this.ensureRh(userId);
    const solicitacao = await this.prisma.biometriaSolicitacao.findUnique({
      where: { id: solicitacaoId },
      include: { dispositivo: true },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação biométrica não encontrada.');
    return solicitacao;
  }

  async listPendentes() {
    await this.expireOldSolicitacoes();

    return this.prisma.biometriaSolicitacao.findMany({
      where: {
        status: StatusBiometriaSolicitacao.PENDENTE,
        idfaceIp: { not: null },
        expiraEm: { gt: new Date() },
      },
      include: {
        candidato: true,
        envelope: true,
        candidatura: { include: { requisicao: { include: { empresa: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
  }

  async assumirSolicitacao(idfaceIp: string, solicitacaoId: number) {
    await this.ensureIdfaceDisponivel(idfaceIp);
    await this.expireOldSolicitacoes();

    const updated = await this.prisma.biometriaSolicitacao.updateMany({
      where: {
        id: solicitacaoId,
        status: StatusBiometriaSolicitacao.PENDENTE,
        idfaceIp,
        expiraEm: { gt: new Date() },
      },
      data: {
        status: StatusBiometriaSolicitacao.EM_ATENDIMENTO,
        assumidaEm: new Date(),
      },
    });
    if (updated.count === 0)
      throw new BadRequestException('Solicitação não está disponível para atendimento.');

    return this.prisma.biometriaSolicitacao.findUnique({
      where: { id: solicitacaoId },
      include: { candidato: true, envelope: true },
    });
  }

  async registrarResultado(
    idfaceIp: string,
    solicitacaoId: number,
    dto: ResultadoBiometriaDto,
    evidence: RequestEvidence,
  ) {
    await this.ensureIdfaceDisponivel(idfaceIp);
    const solicitacao = await this.prisma.biometriaSolicitacao.findUnique({
      where: { id: solicitacaoId },
      include: { candidato: true },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação biométrica não encontrada.');
    if (solicitacao.idfaceIp !== idfaceIp) throw new ForbiddenException('Solicitação destinada a outro iDFace.');
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
        enderecoColeta: dto.enderecoColeta?.trim() || null,
        ipResultado: evidence.ip,
        userAgentResultado: evidence.userAgent,
        payloadHash,
        concluidaEm,
      },
    });

    if (dto.resultado !== ResultadoBiometriaSolicitacao.APROVADO) return updated;

    if (!solicitacao.envelopeId)
      throw new BadRequestException('Solicitação sem envelope para assinatura.');

    // Verifica se é um envelope RESPONSAVEL para validar CPF do responsável legal
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: solicitacao.envelopeId },
      include: { candidatura: { include: { candidato: true } } },
    });
    const isResponsavel = envelope?.tipoSignatario === TipoSignatario.RESPONSAVEL;
    const expectedCpf = isResponsavel
      ? envelope?.candidatura.candidato.responsavelCpf?.replace(/\D/g, '')
      : solicitacao.candidato.cpf.replace(/\D/g, '');
    const cpfLabel = isResponsavel ? 'o responsável legal' : 'o candidato';

    if (cpfRetornado && expectedCpf && cpfRetornado !== expectedCpf) {
      await this.prisma.biometriaSolicitacao.update({
        where: { id: solicitacao.id },
        data: {
          status: StatusBiometriaSolicitacao.REPROVADA,
          mensagem: `CPF retornado não confere com ${cpfLabel}.`,
        },
      });
      throw new BadRequestException(`CPF retornado não confere com ${cpfLabel}.`);
    }

    if (isResponsavel) {
      await this.assinaturas.signResponsavelByBiometria(envelope!.candidaturaId, solicitacao.id, {
        ip: evidence.ip,
        userAgent: evidence.userAgent,
      });
    } else {
      await this.assinaturas.signEnvelopeByBiometria(solicitacao.envelopeId, solicitacao.id, {
        ip: evidence.ip,
        userAgent: evidence.userAgent,
      });
    }
    return updated;
  }

  private createSolicitacao(data: {
    tipo: TipoBiometriaSolicitacao;
    candidatoId: number;
    candidaturaId?: number;
    envelopeId?: number;
    solicitadaPorId: number;
    idfaceIp: string;
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

  private async ensureIdfaceDisponivel(idfaceIp: string) {
    if (!idfaceIp) throw new ForbiddenException('IP do iDFace não informado.');
    const idfaces = await this.seniorApi.get<{ ip: string }[]>('/controlid-idface/dispositivos?modrlg=17');
    if (!idfaces.some((idface) => idface.ip === idfaceIp)) {
      throw new ForbiddenException('iDFace não autorizado.');
    }
  }

  private expireOldSolicitacoes() {
    return this.prisma.biometriaSolicitacao.updateMany({
      where: { status: StatusBiometriaSolicitacao.PENDENTE, expiraEm: { lte: new Date() } },
      data: { status: StatusBiometriaSolicitacao.EXPIRADA },
    });
  }

  private statusFromResultado(resultado: ResultadoBiometriaSolicitacao) {
    if (resultado === ResultadoBiometriaSolicitacao.APROVADO)
      return StatusBiometriaSolicitacao.CONCLUIDA;
    if (resultado === ResultadoBiometriaSolicitacao.REPROVADO)
      return StatusBiometriaSolicitacao.REPROVADA;
    return StatusBiometriaSolicitacao.FALHOU;
  }

  private hash(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
