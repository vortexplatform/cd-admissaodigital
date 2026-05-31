import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

@Injectable()
export class RequisicoesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRequisicaoDto, userId: number) {
    return this.prisma.requisicaoVaga.create({
      data: {
        ...buildRequisicaoData(dto),
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
