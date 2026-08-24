import { BadRequestException, Injectable } from '@nestjs/common';
import { StatusCandidatura, StatusRequisicaoVaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const vagasAbertasStatuses: StatusRequisicaoVaga[] = [
  StatusRequisicaoVaga.ABERTA,
  StatusRequisicaoVaga.AGUARDANDO_CANDIDATO,
  StatusRequisicaoVaga.EM_ADMISSAO,
  StatusRequisicaoVaga.AGUARDANDO_DOCUMENTOS,
  StatusRequisicaoVaga.AGUARDANDO_ASSINATURA,
  StatusRequisicaoVaga.AGUARDANDO_RH,
  StatusRequisicaoVaga.PENDENTE_CORRECAO,
];

const parseDate = (value: string, label: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${label} inválida.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} inválida.`);
  return date;
};

const parsePositiveInteger = (value: string | undefined, fallback: number, max?: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const trinta_dias_atras = new Date();
    trinta_dias_atras.setDate(trinta_dias_atras.getDate() - 30);

    const [vagasAbertas, aprovados, efetivados, admissoesNoMes] = await Promise.all([
      this.prisma.requisicaoVaga.count({
        where: { status: { in: vagasAbertasStatuses } },
      }),

      this.prisma.candidatura.count({
        where: {
          status: StatusCandidatura.APROVADO,
          updatedAt: { gte: trinta_dias_atras },
        },
      }),

      this.prisma.candidatura.count({
        where: {
          status: StatusCandidatura.EFETIVADO,
          updatedAt: { gte: trinta_dias_atras },
        },
      }),

      this.prisma.candidatura.count({
        where: {
          admissao: { gte: trinta_dias_atras },
        },
      }),
    ]);

    return { vagasAbertas, aprovados, efetivados, admissoesNoMes };
  }

  async getColaboradoresAdmitidos({
    dataInicio,
    dataFim,
    page: pageValue,
    limit: limitValue,
  }: {
    dataInicio: string;
    dataFim: string;
    page?: string;
    limit?: string;
  }) {
    const start = parseDate(dataInicio, 'Data inicial');
    const end = parseDate(dataFim, 'Data final');
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    if (start >= endExclusive) throw new BadRequestException('O período informado é inválido.');

    const page = parsePositiveInteger(pageValue, 1);
    const limit = parsePositiveInteger(limitValue, 20, 1000);
    const where = {
      status: StatusCandidatura.EFETIVADO,
      admissao: { gte: start, lt: endExclusive },
    } as const;

    const [total, totalMesAtual, data] = await Promise.all([
      this.prisma.candidatura.count({ where }),
      this.prisma.candidatura.count({
        where: {
          status: StatusCandidatura.EFETIVADO,
          admissao: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      this.prisma.candidatura.findMany({
        where,
        orderBy: [
          { requisicao: { filialNome: 'asc' } },
          { candidato: { nome: 'asc' } },
          { id: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          admissao: true,
          matricula: true,
          candidato: {
            select: {
              nome: true,
              cpf: true,
              dataNascimento: true,
              telefone: true,
              dddTelefone: true,
              numeroTelefone: true,
              tamanhoCalca: true,
              tamanhoCamisa: true,
              tamanhoCalcado: true,
            },
          },
          requisicao: {
            select: {
              filial: true,
              empresa: { select: { nome: true } },
              filialNome: true,
              cargoNome: true,
              cargo: true,
              escala: true,
              descricaoEscala: true,
            },
          },
        },
      }),
    ]);

    return {
      summary: { total, totalMesAtual },
      data: data.map((item) => ({
        id: item.id,
        nome: item.candidato.nome,
        cpf: item.candidato.cpf,
        empresa: item.requisicao.empresa?.nome ?? null,
        filial: item.requisicao.filial,
        filialNome: item.requisicao.filialNome,
        cargo: item.requisicao.cargoNome ?? item.requisicao.cargo,
        idade: this.calculateAge(item.candidato.dataNascimento, item.admissao),
        admissao: item.admissao,
        horario: item.requisicao.descricaoEscala ?? item.requisicao.escala,
        telefone:
          item.candidato.numeroTelefone || item.candidato.telefone
            ? [item.candidato.dddTelefone, item.candidato.numeroTelefone ?? item.candidato.telefone]
                .filter(Boolean)
                .join(' ')
            : null,
        matricula: item.matricula,
      })),
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  private calculateAge(birthDate: Date, referenceDate: Date | null) {
    const reference = referenceDate ?? new Date();
    let age = reference.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDifference = reference.getUTCMonth() - birthDate.getUTCMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && reference.getUTCDate() < birthDate.getUTCDate())
    ) {
      age -= 1;
    }
    return age;
  }

}
