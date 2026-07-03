import { Controller, Get, Param, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContratoExperienciaService } from './relatorios/contrato-experiencia.service';
import { DeclaracaoTreinamentoService } from './relatorios/declaracao-treinamento.service';

@UseGuards(JwtAuthGuard)
@Controller('documentos-templates')
export class DocumentosTemplatesController {
  constructor(
    private readonly contrato: ContratoExperienciaService,
    private readonly declaracao: DeclaracaoTreinamentoService,
  ) {}

  @Get('contrato-experiencia/:candidaturaId')
  async downloadContratoExperiencia(
    @Param('candidaturaId', ParseIntPipe) candidaturaId: number,
    @Res() res: Response,
  ) {
    const pdf = await this.contrato.gerarPdfById(candidaturaId);
    this.sendPdf(res, pdf, `contrato-experiencia-${candidaturaId}.pdf`);
  }

  @Get('declaracao-treinamento/:candidaturaId')
  async downloadDeclaracaoTreinamento(
    @Param('candidaturaId', ParseIntPipe) candidaturaId: number,
    @Res() res: Response,
  ) {
    const pdf = await this.declaracao.gerarPdfById(candidaturaId);
    this.sendPdf(res, pdf, `declaracao-treinamento-${candidaturaId}.pdf`);
  }

  private sendPdf(res: Response, pdf: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
