import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { PAGE_HEIGHT, PAGE_WIDTH, drawAssinaturas, drawFooter, drawHeader, drawParagraphs, wrapText } from './pdf-render.utils';

export type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

const EMPRESA_CNPJ = '41.930.199/0026-92';
const EMPRESA_CIDADE = 'Governador Valadares';
const EMPRESA_ENDERECO = 'MARECHAL FLORIANO, 1527 - CENTRO';

@Injectable()
export class ContratoExperienciaService {
  static readonly CODIGO = 'contrato-experiencia';
  static readonly NOME = 'Contrato de Experiência';

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
    const pdf = await PDFDocument.create();
    pdf.setTitle(ContratoExperienciaService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const empresaNome = candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const cargo = (candidatura.requisicao.cargoNome ?? candidatura.requisicao.cargo ?? 'CARGO NÃO INFORMADO').toUpperCase();
    const dataAdmissao = candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();

    const page1 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharContrato(pdf, page1, regular, bold, { empresaNome, candidatoNome, cargo, dataAdmissao });

    const page2 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharProrrogacao(pdf, page2, regular, bold, { empresaNome, candidatoNome });

    return Buffer.from(await pdf.save());
  }

  private desenharContrato(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    data: { empresaNome: string; candidatoNome: string; cargo: string; dataAdmissao: Date },
  ): void {
    let y = drawHeader(page, bold);

    const title = 'Contrato de Trabalho a T\u00edtulo de Experi\u00eancia';
    page.drawText(title, {
      x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, 11)) / 2,
      y,
      size: 11,
      font: bold,
    });
    y -= 18;

    const conteudo = [
      `Entre a firma ${data.empresaNome}, CNPJ ${EMPRESA_CNPJ} com sede em ${EMPRESA_CIDADE} na ${EMPRESA_ENDERECO}, doravante designada simplesmente EMPREGADORA e ${data.candidatoNome} portador(a) da Carteira Profissional N\xba _________________ a seguir chamado apenas EMPREGADO, e celebrado o presente CONTRATO DE EXPERI\u00caNCIA, que ter\u00e1 vig\u00eancia a partir da data de in\u00edcio de servi\u00e7os, de acordo com as condi\u00e7\u00f5es a seguir especificadas:`,
      `1 - Fica o EMPREGADO admitido no quadro de funcion\u00e1rios da EMPREGADORA para exercer as fun\u00e7\u00f5es de ${data.cargo} mediante a remunera\u00e7\u00e3o de __________ por m\u00eas. A circunst\u00e2ncia, por\u00e9m, de ser a fun\u00e7\u00e3o especificada n\u00e3o importa na intransferibilidade do EMPREGADO para outro servi\u00e7o, o qual demonstre melhor capacidade de adapta\u00e7\u00e3o desde que compat\u00edvel com a sua condi\u00e7\u00e3o pessoal.`,
      `2 - O hor\u00e1rio de trabalho ser\u00e1 anotado na sua ficha de registro e a eventual redu\u00e7\u00e3o de jornada, por determina\u00e7\u00e3o da EMPREGADORA, n\u00e3o inovar\u00e1 este ajuste, permanecendo sempre \u00edntegra a obriga\u00e7\u00e3o do EMPREGADO de cumprir o hor\u00e1rio que lhe for determinado, observando o limite legal.`,
      `3 - Obriga-se tamb\u00e9m o EMPREGADO a prestar servi\u00e7os em horas extraordin\u00e1rias, sempre que lhe for determinado pela EMPREGADORA na forma prevista em Lei. Na hip\u00f3tese desta faculdade pela EMPREGADORA, o EMPREGADO receber\u00e1 as horas extraordin\u00e1rias em acr\u00e9scimo legal, salvo a ocorr\u00eancia de compensa\u00e7\u00e3o, com a consequente redu\u00e7\u00e3o da jornada de trabalho em outro dia.`,
      `4 - Aceita o EMPREGADO, expressamente, a condi\u00e7\u00e3o de prestar servi\u00e7os em qualquer dos turnos de trabalho, isto \u00e9, tanto durante o dia como a noite, desde que sem simultaneidade, observadas as prescri\u00e7\u00f5es legais, reguladoras do assunto, quanto \u00e0 remunera\u00e7\u00e3o.`,
      `5 - Fica ajustado nos termos do que disp\u00f5e o Par. 1\u00ba do artigo 469 da Consolida\u00e7\u00e3o das Leis do Trabalho, que o EMPREGADO acatar\u00e1 ordem emanada da EMPREGADORA para presta\u00e7\u00e3o de servi\u00e7os tanto na localidade de celebra\u00e7\u00e3o do Contrato de Trabalho, como em qualquer outra Cidade, Capital ou Vila do Territ\u00f3rio Nacional, quer essa transfer\u00eancia seja transit\u00f3ria, quer seja definitiva.`,
      `6 - No ato da assinatura deste contrato, o EMPREGADO recebe o Regulamento Interno da Empresa cujas cl\u00e1usulas fazem parte do Contrato de Trabalho, e a viola\u00e7\u00e3o de qualquer delas implicar\u00e1 em san\u00e7\u00e3o, cuja gradua\u00e7\u00e3o depender\u00e1 da gravidade da mesma, culminando com a rescis\u00e3o do Contrato.`,
      `7 - Em caso de dano causado pelo EMPREGADO, fica a EMPREGADORA autorizada a efetivar o desconto da import\u00e2ncia correspondente ao preju\u00edzo, com fundamento no Par\u00e1grafo 1\u00ba do Artigo 462 da Consolida\u00e7\u00e3o das Leis do Trabalho, j\u00e1 que essa possibilidade fica expressamente prevista em Contrato.`,
      `8 - O presente Contrato viger\u00e1 durante 30 dias, sendo celebrado para as partes verificarem reciprocamente a conveni\u00eancia ou n\u00e3o de se vincularem em car\u00e1ter definitivo a um Contrato de Trabalho. A Empresa passando a conhecer as aptid\u00f5es do EMPREGADO e suas qualidades pessoais e morais; o EMPREGADO verificando se o ambiente e os m\u00e9todos de trabalho atendem a sua conveni\u00eancia.`,
      `9 - Opera-se a rescis\u00e3o do presente Contrato pela decorr\u00eancia do prazo supra ou por vontade de uma das partes; rescindindo-se por vontade do EMPREGADO ou pela EMPREGADORA com justa causa, nenhuma indeniza\u00e7\u00e3o \u00e9 devida; rescindindo-se, antes do prazo, por qualquer uma das partes, fica esta obrigada a pagar 50% dos sal\u00e1rios at\u00e9 o final.`,
      `10 - Na hip\u00f3tese deste ajuste transformar-se em Contrato de Prazo Indeterminado pelo decurso do tempo, continuar\u00e3o em plena vig\u00eancia as cl\u00e1usulas de 1 (um) a 7 (sete), enquanto durarem as rela\u00e7\u00f5es do EMPREGADO com a EMPREGADORA.`,
      `E por estarem de pleno acordo, as partes contratantes, assinam o presente Contrato de Experi\u00eancia em duas vias, ficando a primeira em poder da EMPREGADORA, e a segunda com o EMPREGADO, que dela dar\u00e1 o competente recibo.`,
      `${EMPRESA_CIDADE}, ${this.formatarData(data.dataAdmissao)}.`,
    ].join('\n');

    const { page: lastPage, y: lastY } = drawParagraphs(pdf, page, conteudo, regular, y, 8.5, {
      lineHeight: 11,
      paragraphSpacing: 4,
      blankLineHeight: 0,
      x: 42,
      maxWidth: 511,
    });
    drawAssinaturas(pdf, lastPage, regular, bold, lastY - 14, data.empresaNome, data.candidatoNome);
    drawFooter(page);
  }

  private desenharProrrogacao(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    data: { empresaNome: string; candidatoNome: string },
  ): void {
    let y = drawHeader(page, bold);

    const title = 'Termo de Prorrogação';
    page.drawText(title, {
      x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, 12)) / 2,
      y,
      size: 12,
      font: bold,
    });
    y -= 30;

    const corpo = 'Por mútuo acordo entre as partes, fica o presente Contrato de Experiência, que deveria vencer nesta data prorrogado até _______/_______/_______.';
    for (const line of wrapText(corpo, regular, 9.5, 455)) {
      page.drawText(line, { x: 70, y, size: 9.5, font: regular });
      y -= 13;
    }

    drawAssinaturas(pdf, page, regular, bold, y - 40, data.empresaNome, data.candidatoNome);
    drawFooter(page);
  }

  private formatarData(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
}
