import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusCandidatura, StatusRequisicaoVaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequisicaoDto } from './dto/create-requisicao.dto';
import { UpdateRequisicaoDto } from './dto/update-requisicao.dto';

const requisicaoInclude = {
  empresa: true,
  candidaturas: {
    include: { candidato: true },
    orderBy: { createdAt: 'desc' },
  },
  criadoPor: true,
  aprovadoPor: true,
} satisfies Prisma.RequisicaoVagaInclude;

const cleanString = (value?: string) => value?.trim() || undefined;

const buildRequisicaoData = (dto: CreateRequisicaoDto | UpdateRequisicaoDto) => ({
  tipo: dto.tipo,
  status: dto.status,
  empresaId: dto.empresaId,
  quantidadeVagas: dto.quantidadeVagas,
  filial: dto.filial,
  filialNome: cleanString(dto.filialNome),
  postoTrabalho: cleanString(dto.postoTrabalho),
  postoTrabalhoNome: cleanString(dto.postoTrabalhoNome),
  cargo: cleanString(dto.cargo),
  cargoNome: cleanString(dto.cargoNome),
  centroCusto: cleanString(dto.centroCusto),
  ccustoNome: cleanString(dto.ccustoNome),
  escala: cleanString(dto.escala),
  descricaoEscala: cleanString(dto.descricaoEscala),
  sindicato: cleanString(dto.sindicato),
  dataPrevistaAdmissao: dto.dataPrevistaAdmissao ? new Date(dto.dataPrevistaAdmissao) : undefined,
  motivoAbertura: cleanString(dto.motivoAbertura),
  observacao: cleanString(dto.observacao),
  codigoRequisicaoSenior: cleanString(dto.codigoRequisicaoSenior),
  codigoCandidatoSenior: cleanString(dto.codigoCandidatoSenior),
  codigoColaboradorSenior: cleanString(dto.codigoColaboradorSenior),
});

const optionalNumber = (value?: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const normalizeSearchTerm = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';

const clampLimit = (value?: string) => {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 20;

  return Math.min(Math.max(Math.trunc(limit), 1), 50);
};

const activeCandidaturaStatuses = new Set<StatusCandidatura>([
  StatusCandidatura.INSCRITO,
  StatusCandidatura.EM_ANALISE,
  StatusCandidatura.ENTREVISTA,
  StatusCandidatura.APROVADO,
]);

@Injectable()
export class RequisicoesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRequisicaoDto, userId: number) {
    return this.prisma.requisicaoVaga.create({
      data: {
        ...buildRequisicaoData(dto),
        status: StatusRequisicaoVaga.ABERTA,
        criadoPorUserId: userId,
      },
      include: requisicaoInclude,
    });
  }

  findAll() {
    return this.prisma.requisicaoVaga.findMany({
      include: requisicaoInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDisponiveis({
    candidatoId,
    limit,
    q,
  }: {
    candidatoId?: string;
    limit?: string;
    q?: string;
  }) {
    const parsedCandidatoId = optionalNumber(candidatoId);
    const searchTerm = normalizeSearchTerm(q);
    const parsedRequisicaoId = optionalNumber(searchTerm);
    const searchWhere: Prisma.RequisicaoVagaWhereInput = searchTerm
      ? {
          OR: [
            ...(parsedRequisicaoId ? [{ id: parsedRequisicaoId }] : []),
            { cargoNome: { contains: searchTerm, mode: 'insensitive' } },
            { cargo: { contains: searchTerm, mode: 'insensitive' } },
            { filialNome: { contains: searchTerm, mode: 'insensitive' } },
            { ccustoNome: { contains: searchTerm, mode: 'insensitive' } },
            { empresa: { nome: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        }
      : {};
    const requisicoes = await this.prisma.requisicaoVaga.findMany({
      where: {
        ...searchWhere,
        status: {
          in: [
            StatusRequisicaoVaga.RASCUNHO,
            StatusRequisicaoVaga.ABERTA,
            StatusRequisicaoVaga.AGUARDANDO_CANDIDATO,
          ],
        },
      },
      include: {
        empresa: true,
        candidaturas: {
          select: { candidatoId: true, status: true },
        },
      },
      orderBy: [{ dataPrevistaAdmissao: 'asc' }, { createdAt: 'desc' }],
    });

    return requisicoes
      .map((requisicao) => {
        const vagasOcupadas = requisicao.candidaturas.filter((candidatura) =>
          activeCandidaturaStatuses.has(candidatura.status),
        ).length;
        return {
          ...requisicao,
          vagasDisponiveis: Math.max(requisicao.quantidadeVagas - vagasOcupadas, 0),
        };
      })
      .filter((requisicao) => {
        if (requisicao.vagasDisponiveis <= 0) return false;
        if (!parsedCandidatoId) return true;

        return !requisicao.candidaturas.some(
          (candidatura) => candidatura.candidatoId === parsedCandidatoId,
        );
      })
      .slice(0, clampLimit(limit));
  }

  async findOne(id: number) {
    const requisicao = await this.prisma.requisicaoVaga.findUnique({
      where: { id },
      include: requisicaoInclude,
    });
    if (!requisicao) throw new NotFoundException('Requisição não encontrada');

    return requisicao;
  }

  async update(id: number, dto: UpdateRequisicaoDto) {
    await this.findOne(id);

    return this.prisma.requisicaoVaga.update({
      where: { id },
      data: buildRequisicaoData(dto),
      include: requisicaoInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.requisicaoVaga.delete({ where: { id } });

    return { deleted: true };
  }
}
