import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AcordoDomingosFeriadosService } from './relatorios/acordo-domingos-feriados.service';
import { AutorizacaoPlanoSaudeService } from './relatorios/autorizacao-plano-saude.service';
import { ContratoExperienciaService } from './relatorios/contrato-experiencia.service';
import { DeclaracaoEncargosIrService } from './relatorios/declaracao-encargos-ir.service';
import { DeclaracaoTreinamentoService } from './relatorios/declaracao-treinamento.service';
import { TermoValeTransporteService } from './relatorios/termo-vale-transporte.service';
import { TermoProrrogacaoExperienciaService } from './relatorios/termo-prorrogacao-experiencia.service';

export type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: { include: { valeTransportes: true; dependentes: true } }; requisicao: { include: { empresa: true } } };
}>;

@Injectable()
export class DocumentosTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contrato: ContratoExperienciaService,
    private readonly declaracaoEncargosIr: DeclaracaoEncargosIrService,
    private readonly declaracao: DeclaracaoTreinamentoService,
    private readonly acordoDomingosFeriados: AcordoDomingosFeriadosService,
    private readonly termoProrrogacao: TermoProrrogacaoExperienciaService,
    private readonly autorizacaoPlanoSaude: AutorizacaoPlanoSaudeService,
    private readonly termoValeTransporte: TermoValeTransporteService,
  ) {}

  async gerarPdf(codigo: string, candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: { include: { valeTransportes: true, dependentes: true } }, requisicao: { include: { empresa: true } } },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');

    return this.gerarPdfParaCandidatura(codigo, candidatura);
  }

  gerarPdfParaCandidatura(codigo: string, candidatura: CandidaturaContrato): Promise<Buffer> {
    switch (codigo) {
      case ContratoExperienciaService.CODIGO:
        return this.contrato.gerarPdf(candidatura);
      case DeclaracaoEncargosIrService.CODIGO:
        return this.declaracaoEncargosIr.gerarPdf(candidatura);
      case DeclaracaoTreinamentoService.CODIGO:
        return this.declaracao.gerarPdf(candidatura);
      case AcordoDomingosFeriadosService.CODIGO:
        return this.acordoDomingosFeriados.gerarPdf(candidatura);
      case TermoProrrogacaoExperienciaService.CODIGO:
        return this.termoProrrogacao.gerarPdf(candidatura);
      case AutorizacaoPlanoSaudeService.CODIGO:
        return this.autorizacaoPlanoSaude.gerarPdf(candidatura);
      case TermoValeTransporteService.CODIGO:
        return this.termoValeTransporte.gerarPdf(candidatura);
      default:
        throw new NotFoundException(`Template de documento "${codigo}" não encontrado.`);
    }
  }
}
