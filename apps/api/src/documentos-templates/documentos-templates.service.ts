import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContratoExperienciaService } from './contrato-experiencia.service';
import { DeclaracaoTreinamentoService } from './declaracao-treinamento.service';

export type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

@Injectable()
export class DocumentosTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contrato: ContratoExperienciaService,
    private readonly declaracao: DeclaracaoTreinamentoService,
  ) {}

  async gerarPdf(codigo: string, candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, requisicao: { include: { empresa: true } } },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');

    return this.gerarPdfParaCandidatura(codigo, candidatura);
  }

  gerarPdfParaCandidatura(codigo: string, candidatura: CandidaturaContrato): Promise<Buffer> {
    switch (codigo) {
      case ContratoExperienciaService.CODIGO:
        return this.contrato.gerarPdf(candidatura);
      case DeclaracaoTreinamentoService.CODIGO:
        return this.declaracao.gerarPdf(candidatura);
      default:
        throw new NotFoundException(`Template de documento "${codigo}" não encontrado.`);
    }
  }
}
