import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCandidatura, StatusRequisicaoVaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import { UpdateCandidaturaDataAdmissaoPrevistaDto } from './dto/update-candidatura-data-admissao-prevista.dto';
import { UpdateCandidaturaStatusDto } from './dto/update-candidatura-status.dto';

const candidaturaInclude = {
  candidato: true,
  requisicao: {
    include: { empresa: true },
  },
} satisfies Prisma.CandidaturaInclude;

@Injectable()
export class CandidaturasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requisicaoId: number, dto: CreateCandidaturaDto, criadoPorUserId: number) {
    const requisicao = await this.ensureRequisicaoExists(requisicaoId);
    await this.ensureCandidatoExists(dto.candidatoId);
    await this.ensureVagaDisponivelParaVinculo(requisicaoId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const candidatura = await tx.candidatura.create({
          data: {
            requisicaoId,
            candidatoId: dto.candidatoId,
            criadoPorUserId,
            dataAdmissaoPrevista: requisicao.dataPrevistaAdmissao,
          },
          include: candidaturaInclude,
        });

        await tx.requisicaoVaga.update({
          where: { id: requisicaoId },
          data: { status: StatusRequisicaoVaga.AGUARDANDO_CANDIDATO },
        });

        return candidatura;
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findByRequisicao(requisicaoId: number) {
    await this.ensureRequisicaoExists(requisicaoId);

    return this.prisma.candidatura.findMany({
      where: { requisicaoId },
      include: candidaturaInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCandidato(candidatoId: number) {
    await this.ensureCandidatoExists(candidatoId);

    return this.prisma.candidatura.findMany({
      where: { candidatoId },
      include: candidaturaInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: number, dto: UpdateCandidaturaStatusDto) {
    const candidatura = await this.findOne(id);

    if (dto.status === StatusCandidatura.APROVADO) {
      await this.ensureVagaDisponivel(candidatura.requisicaoId, id);
    }

    const updated = await this.prisma.candidatura.update({
      where: { id },
      data: { status: dto.status },
      include: candidaturaInclude,
    });

    if (dto.status === StatusCandidatura.APROVADO) {
      await this.concluirRequisicaoSeVagasPreenchidas(candidatura.requisicaoId);
    }

    return updated;
  }

  async updateDataAdmissaoPrevista(
    id: number,
    dto: UpdateCandidaturaDataAdmissaoPrevistaDto,
  ) {
    await this.findOne(id);

    return this.prisma.candidatura.update({
      where: { id },
      data: {
        dataAdmissaoPrevista: dto.dataAdmissaoPrevista ? new Date(dto.dataAdmissaoPrevista) : null,
      },
      include: candidaturaInclude,
    });
  }

  async remove(id: number) {
    const candidatura = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.candidatura.delete({ where: { id } });

      const candidaturasRestantes = await tx.candidatura.count({
        where: { requisicaoId: candidatura.requisicaoId },
      });

      if (candidaturasRestantes > 0) return;

      await tx.requisicaoVaga.update({
        where: { id: candidatura.requisicaoId },
        data: { status: StatusRequisicaoVaga.ABERTA },
      });
    });

    return { deleted: true };
  }

  private async findOne(id: number) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id },
      include: candidaturaInclude,
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada');

    return candidatura;
  }

  private async ensureRequisicaoExists(id: number) {
    const requisicao = await this.prisma.requisicaoVaga.findUnique({ where: { id } });
    if (!requisicao) throw new NotFoundException('Requisição não encontrada');

    return requisicao;
  }

  private async ensureCandidatoExists(id: number) {
    const candidato = await this.prisma.candidato.findUnique({ where: { id } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');

    return candidato;
  }

  private async ensureVagaDisponivelParaVinculo(requisicaoId: number) {
    const requisicao = await this.ensureRequisicaoExists(requisicaoId);
    const ativas = await this.prisma.candidatura.count({
      where: {
        requisicaoId,
        status: {
          in: [
            StatusCandidatura.INSCRITO,
            StatusCandidatura.EM_ANALISE,
            StatusCandidatura.ENTREVISTA,
            StatusCandidatura.APROVADO,
          ],
        },
      },
    });

    if (ativas >= requisicao.quantidadeVagas) {
      throw new BadRequestException(
        'Todas as vagas desta requisição já estão preenchidas por candidatos ativos.',
      );
    }
  }

  private async ensureVagaDisponivel(requisicaoId: number, candidaturaId: number) {
    const requisicao = await this.ensureRequisicaoExists(requisicaoId);
    const aprovadas = await this.prisma.candidatura.count({
      where: {
        requisicaoId,
        status: StatusCandidatura.APROVADO,
        id: { not: candidaturaId },
      },
    });

    if (aprovadas >= requisicao.quantidadeVagas) {
      throw new BadRequestException('A quantidade de vagas aprovadas já foi atingida.');
    }
  }

  private async concluirRequisicaoSeVagasPreenchidas(requisicaoId: number) {
    const requisicao = await this.ensureRequisicaoExists(requisicaoId);
    const aprovadas = await this.prisma.candidatura.count({
      where: {
        requisicaoId,
        status: StatusCandidatura.APROVADO,
      },
    });

    if (aprovadas >= requisicao.quantidadeVagas) {
      await this.prisma.requisicaoVaga.update({
        where: { id: requisicaoId },
        data: { status: StatusRequisicaoVaga.EM_ADMISSAO },
      });
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Candidato já vinculado a esta requisição.');
    }

    throw error;
  }
}
