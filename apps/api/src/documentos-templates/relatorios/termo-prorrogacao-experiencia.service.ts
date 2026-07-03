import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawAssinaturasEletronicas,
  drawFooter,
  drawHeader,
  drawParagraphs,
} from '../pdf-render.utils';

type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

@Injectable()
export class TermoProrrogacaoExperienciaService {
  static readonly CODIGO = 'termo-prorrogacao-experiencia';
  static readonly NOME = 'Termo de Prorrogação do Contrato de Experiência';

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
    const prazoContratoDias = candidatura.requisicao.prazoContratoDias ?? 30;
    const prorrogacaoDias = candidatura.requisicao.prorrogacaoDias;

    if (!prorrogacaoDias || prorrogacaoDias <= 0) {
      throw new BadRequestException(
        'A candidatura não possui prazo de prorrogação definido para gerar o Termo de Prorrogação.',
      );
    }
    if (prazoContratoDias + prorrogacaoDias > 90) {
      throw new BadRequestException(
        'O prazo total do contrato de experiência (inicial + prorrogação) não pode exceder 90 dias (CLT Art. 445).',
      );
    }

    const empresaNome =
      candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();

    const pdf = await PDFDocument.create();
    pdf.setTitle(TermoProrrogacaoExperienciaService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharTermo(pdf, page, regular, bold, {
      empresaNome,
      candidatoNome,
      prazoContratoDias,
      prorrogacaoDias,
    });

    return Buffer.from(await pdf.save());
  }

  private desenharTermo(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    data: {
      empresaNome: string;
      candidatoNome: string;
      prazoContratoDias: number;
      prorrogacaoDias: number;
    },
  ): void {
    let y = drawHeader(page, bold);

    const title = TermoProrrogacaoExperienciaService.NOME;
    page.drawText(title, {
      x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, 11)) / 2,
      y,
      size: 11,
      font: bold,
    });
    y -= 28;

    const total = data.prazoContratoDias + data.prorrogacaoDias;

    const conteudo = [
      `Por m\u00fatuo acordo entre as partes, fica o presente Contrato de Experi\u00eancia (${data.prazoContratoDias} dias) prorrogado por mais ${data.prorrogacaoDias} dias, totalizando ${total} dias, nos termos do Art. 445, par\u00e1grafo \u00fanico, da CLT.`,
      `A prorroga\u00e7\u00e3o ter\u00e1 vig\u00eancia a partir do vencimento do prazo inicial do contrato, encerrando-se automaticamente ao t\u00e9rmino do prazo acima estabelecido.`,
      `Este Termo \u00e9 firmado por meio de assinatura eletr\u00f4nica/digital, conforme o m\u00e9todo utilizado por cada parte. A assinatura do empregado \u00e9 realizada por assinatura eletr\u00f4nica avan\u00e7ada por OTP, nos termos do Art. 10, \u00a72\u00ba, da MP 2.200-2/2001 e da Lei 14.063/2020, e a assinatura da empregadora \u00e9 realizada com certificado digital ICP-Brasil, garantindo autoria, integridade, rastreabilidade e for\u00e7a de instrumento particular entre as partes. O documento eletr\u00f4nico \u00e9 disponibilizado \u00e0s partes acompanhado de comprovante de assinatura, integridade e auditoria.`,
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
}
