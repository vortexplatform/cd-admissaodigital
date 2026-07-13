import { Injectable } from '@nestjs/common';
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
}
