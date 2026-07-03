import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawAssinaturasEletronicas,
  drawFooter,
  drawParagraphs,
} from '../pdf-render.utils';

type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

@Injectable()
export class AutorizacaoPlanoSaudeService {
  static readonly CODIGO = 'autorizacao-plano-saude';
  static readonly NOME = 'Autorização Desconto Plano de Saúde';

  constructor(private readonly prisma: PrismaService) {}

  async gerarPdfById(candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, requisicao: { include: { empresa: true } } },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    return this.gerarPdf(candidatura);
  }

  async gerarPdf(candidatura: CandidaturaContrato): Promise<Buffer> {
    const empresaNome =
      candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const candidatoCpf = this.formatarCpf(candidatura.candidato.cpf);
    const cargo = (
      candidatura.requisicao.cargoNome ??
      candidatura.requisicao.cargo ??
      'CARGO NÃO INFORMADO'
    ).toUpperCase();

    const pdf = await PDFDocument.create();
    pdf.setTitle(AutorizacaoPlanoSaudeService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharAutorizacao(pdf, page, regular, bold, {
      empresaNome,
      candidatoNome,
      candidatoCpf,
      cargo,
    });

    return Buffer.from(await pdf.save());
  }

  private formatarCpf(cpf: string): string {
    const d = cpf.replace(/\D/g, '');
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  private desenharAutorizacao(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    data: {
      empresaNome: string;
      candidatoNome: string;
      candidatoCpf: string;
      cargo: string;
    },
  ): void {
    const { height } = page.getSize();

    // Linha decorativa superior dupla (sem logo)
    page.drawLine({ start: { x: 36, y: height - 50 }, end: { x: 559, y: height - 50 }, thickness: 2, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 36, y: height - 54 }, end: { x: 559, y: height - 54 }, thickness: 0.7, color: rgb(0, 0, 0) });

    // Título centralizado
    const title1 = 'AUTORIZA\u00c7\u00c3O DESCONTO PLANO DE SA\u00daDE';
    const title2 = 'SUPERMERCADO COELHO DINIZ LTDA - CORONEL FABRICIANO e TIMOTEO/MG';
    page.drawText(title1, {
      x: (PAGE_WIDTH - bold.widthOfTextAtSize(title1, 11)) / 2,
      y: height - 82,
      size: 11,
      font: bold,
    });
    page.drawText(title2, {
      x: (PAGE_WIDTH - bold.widthOfTextAtSize(title2, 9)) / 2,
      y: height - 96,
      size: 9,
      font: bold,
    });

    let y = height - 136;

    // Campos identificação
    this.drawField(page, regular, bold, 'Nome:', data.candidatoNome, 70, y, 10);
    y -= 22;
    this.drawField(page, regular, bold, 'Cargo:', data.cargo, 70, y, 10);
    y -= 22;
    this.drawField(page, regular, bold, 'CPF:', data.candidatoCpf, 70, y, 10);
    y -= 26;

    // Corpo do texto
    const conteudo = [
      'Declaro para os devidos fins que recebi todas as orienta\u00e7\u00f5es e regras do Plano de Sa\u00fade, estando ciente que devo utiliz\u00e1-lo de forma consciente, bem como autorizo a empresa a efetuar mensalmente desconto em meus proventos dos valores relativos ao custeio sob minha responsabilidade, tudo conforme estabelecido pela cl\u00e1usula da conven\u00e7\u00e3o coletiva firmada pelo sindicato de minha categoria, qual seja o SINDICATO DOS EMPREGADOS NO COMERCIO DE TIMOTEO E CORONEL FABRICIANO \u2013 SECTEO \u2013 CF , tendo conhecimento que os valores poder\u00e3o sofrer altera\u00e7\u00f5es peri\u00f3dicas.',
      'Declaro ainda, que fui cientificado que a hip\u00f3tese de rescis\u00e3o do meu contrato de trabalho, por for\u00e7a da Lei 9656/98, poderei permanecer no Plano nos termos e condi\u00e7\u00f5es previstas na Lei n\u00ba 9656/98, desde que assuma o custeio integral da contribui\u00e7\u00e3o mensal.',
      'Este documento \u00e9 assinado por meio de assinatura eletr\u00f4nica/digital, conforme o m\u00e9todo utilizado por cada parte. A assinatura do empregado \u00e9 realizada por assinatura eletr\u00f4nica avan\u00e7ada por OTP, nos termos do Art. 10, \u00a72\u00ba, da MP 2.200-2/2001 e da Lei 14.063/2020, e a assinatura da empregadora \u00e9 realizada com certificado digital ICP-Brasil.',
    ].join('\n');

    const { page: lastPage, y: lastY } = drawParagraphs(pdf, page, conteudo, regular, y, 10, {
      lineHeight: 14,
      paragraphSpacing: 14,
      blankLineHeight: 0,
      x: 42,
      maxWidth: 511,
    });

    drawAssinaturasEletronicas(
      lastPage,
      regular,
      bold,
      lastY - 20,
      data.empresaNome,
      data.candidatoNome,
    );
    drawFooter(page);
  }

  private drawField(
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    label: string,
    value: string,
    x: number,
    y: number,
    size: number,
  ): void {
    page.drawText(label, { x, y, size, font: bold });
    const labelWidth = bold.widthOfTextAtSize(`${label} `, size);
    page.drawText(value, { x: x + labelWidth, y, size, font: regular });
  }
}
