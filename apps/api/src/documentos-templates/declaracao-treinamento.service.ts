import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { PAGE_HEIGHT, PAGE_WIDTH, drawParagraphs, wrapText } from './pdf-render.utils';

type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

const EMPRESA_NOME = 'Supermercado Coelho Diniz Ltda';
const EMPRESA_CNPJ = '41.930.199/0001-34';
const EMPRESA_CIDADE = 'Governador Valadares';
const EMPRESA_FOOTER = 'Matriz: Rua Marechal Floriano, 1495 - Centro - Fone (33) 3279-6104 | Gov. Valadares - MG - email: coelhodiniz@uol.com.br';

const BULLETS = [
  'Não prestar serviços sem ter registrado sua entrada no ponto eletronicamente;',
  'Jamais cumprir menos do que uma hora ou mais de duas horas de intervalo para refeição e descanso;',
  'Ao deixar o local de prestação de serviços para ausências, intervalos inter e intrajornada sempre marcar os horários de saídas;',
  'As ocorrências de entrada e saída obrigatoriamente deverão sempre impressas, cujo comprovante retrata fielmente a jornada de trabalho;',
  'A jornada semanal é de 44 horas, estando sujeito a prorrogação e compensação conforme contrato assinado, com apuração no método compensação e prorrogação ou mesmo Banco de Horas, acumulando e compensando-se horas para apuração das horas extras laboradas ou horas a serem laboradas posteriormente.',
  'Eventuais irregularidades ou impossibilidade de utilização do ponto eletrônico (exemplo: falta de papel) deve ser comunicada no mesmo momento ao superior hierárquico.',
];

@Injectable()
export class DeclaracaoTreinamentoService {
  static readonly CODIGO = 'declaracao-treinamento-biometrico';
  static readonly NOME = 'Declaração de Treinamento - Registro Eletrônico Biométrico';

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
    pdf.setTitle(DeclaracaoTreinamentoService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharDeclaracao(pdf, page, regular, bold, candidatoNome);

    return Buffer.from(await pdf.save());
  }

  private desenharDeclaracao(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    candidatoNome: string,
  ): void {
    const { height } = page.getSize();

    // Header logo (esquerda)
    page.drawRectangle({ x: 36, y: height - 58, width: 108, height: 34, color: rgb(1, 0.92, 0.05) });
    page.drawText('CD Coelho Diniz', { x: 44, y: height - 46, size: 12, font: bold, color: rgb(0.08, 0.08, 0.08) });

    // Info empresa (direita)
    const nomeWidth = regular.widthOfTextAtSize(EMPRESA_NOME, 9);
    const cnpjWidth = regular.widthOfTextAtSize(EMPRESA_CNPJ, 9);
    page.drawText(EMPRESA_NOME, { x: 559 - nomeWidth, y: height - 44, size: 9, font: regular });
    page.drawText(EMPRESA_CNPJ, { x: 559 - cnpjWidth, y: height - 55, size: 9, font: regular });

    // Linhas decorativas
    page.drawLine({ start: { x: 36, y: height - 66 }, end: { x: 559, y: height - 66 }, thickness: 2, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 36, y: height - 70 }, end: { x: 559, y: height - 70 }, thickness: 0.7, color: rgb(0, 0, 0) });

    let y = height - 96;

    // Título
    const title = DeclaracaoTreinamentoService.NOME;
    const titleWidth = bold.widthOfTextAtSize(title, 12);
    page.drawText(title, { x: (PAGE_WIDTH - titleWidth) / 2, y, size: 12, font: bold });
    y -= 28;

    // Empregado(a)
    page.drawText('Empregado(a): ', { x: 70, y, size: 10, font: bold });
    const labelWidth = bold.widthOfTextAtSize('Empregado(a): ', 10);
    page.drawText(candidatoNome, { x: 70 + labelWidth, y, size: 10, font: regular });
    y -= 22;

    // Texto introdutório
    const intro = 'Declaro haver lido e compreendido o conteúdo abaixo relativo ao assunto e ter recebido treinamento para utilização do \'Registro Eletrônico Biométrico da Jornada de Trabalho\'. Estou ciente, portanto, de que utilizar o Registro Eletrônico corretamente faz parte das minhas obrigações como funcionário tendo como premissas principais:';
    const { y: yAposIntro } = drawParagraphs(pdf, page, intro, regular, y, 10);
    y = yAposIntro;

    // Bullets
    for (const bullet of BULLETS) {
      y -= 6;
      const lines = wrapText(`\u2022 ${bullet}`, regular, 10, 455);
      for (const line of lines) {
        page.drawText(line, { x: 70, y, size: 10, font: regular });
        y -= 13;
      }
    }

    y -= 10;
    page.drawText('Por ser verdade, firmo a presente.', { x: 70, y, size: 10, font: regular });
    y -= 30;

    // Data
    const dataTexto = `${EMPRESA_CIDADE}, ________/________/____________.`;
    const dataWidth = regular.widthOfTextAtSize(dataTexto, 10);
    page.drawText(dataTexto, { x: (PAGE_WIDTH - dataWidth) / 2, y, size: 10, font: regular });
    y -= 60;

    // Linha de assinatura (só candidato)
    page.drawLine({ start: { x: 150, y }, end: { x: 445, y }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
    const nomeCandWidth = bold.widthOfTextAtSize(candidatoNome, 10);
    page.drawText(candidatoNome, { x: (PAGE_WIDTH - nomeCandWidth) / 2, y: y - 16, size: 10, font: bold });

    // Footer específico desta declaração
    this.drawFooterDeclaracao(page, regular);
  }

  private drawFooterDeclaracao(page: PDFPage, regular: PDFFont): void {
    page.drawLine({ start: { x: 36, y: 50 }, end: { x: 559, y: 50 }, thickness: 0.7, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 36, y: 46 }, end: { x: 559, y: 46 }, thickness: 2, color: rgb(0, 0, 0) });
    const footerWidth = regular.widthOfTextAtSize(EMPRESA_FOOTER, 8);
    page.drawText(EMPRESA_FOOTER, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: 32,
      size: 8,
      font: regular,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
}
