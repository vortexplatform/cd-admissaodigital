import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const TEXTO_ASSINATURA_ELETRONICA = 'As partes reconhecem e aceitam que este documento poderá ser firmado por assinatura eletrônica, nos termos do Art. 10, §2º, da MP 2.200-2/2001 e da Lei 14.063/2020, mediante método de autenticação adotado pela plataforma Admissão Digital, incluindo assinatura eletrônica avançada por código OTP, validação biométrica e/ou reconhecimento facial, conforme aplicável. O método utilizado será registrado no comprovante de assinatura e auditoria do documento, com evidências de autoria, integridade, data/hora, identificação do signatário e rastreabilidade, produzindo validade jurídica e força de instrumento particular entre as partes. A assinatura da empregadora poderá ser realizada por representante autorizado com certificado digital ICP-Brasil ou outro meio eletrônico admitido pela legislação aplicável.';

export function drawHeader(page: PDFPage, bold: PDFFont): number {
  const { height } = page.getSize();
  page.drawRectangle({ x: 36, y: height - 58, width: 108, height: 34, color: rgb(1, 0.92, 0.05) });
  page.drawText('CD Coelho Diniz', { x: 44, y: height - 46, size: 12, font: bold, color: rgb(0.08, 0.08, 0.08) });
  page.drawLine({ start: { x: 36, y: height - 66 }, end: { x: 559, y: height - 66 }, thickness: 2, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: 36, y: height - 70 }, end: { x: 559, y: height - 70 }, thickness: 0.7, color: rgb(0, 0, 0) });
  return height - 96;
}

export interface DrawParagraphsOptions {
  lineHeight?: number;       // espaçamento entre linhas (padrão: 13)
  paragraphSpacing?: number; // espaço extra ao fim de cada parágrafo (padrão: 6)
  blankLineHeight?: number;  // altura de uma linha vazia (padrão: 10)
  x?: number;                // margem esquerda (padrão: 70)
  maxWidth?: number;         // largura máxima do texto (padrão: 455)
}

export function drawParagraphs(
  pdf: PDFDocument,
  startPage: PDFPage,
  content: string,
  font: PDFFont,
  startY: number,
  size: number,
  options?: DrawParagraphsOptions,
): { page: PDFPage; y: number } {
  const lineHeight = options?.lineHeight ?? 13;
  const paragraphSpacing = options?.paragraphSpacing ?? 6;
  const blankLineHeight = options?.blankLineHeight ?? 10;
  const x = options?.x ?? 70;
  const maxWidth = options?.maxWidth ?? 455;

  let page = startPage;
  let cursorY = startY;

  for (const paragraph of content.split('\n')) {
    if (!paragraph.trim()) {
      cursorY -= blankLineHeight;
      continue;
    }
    for (const line of wrapText(paragraph, font, size, maxWidth)) {
      if (cursorY < 70) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursorY = 785;
      }
      page.drawText(line, { x, y: cursorY, size, font, color: rgb(0, 0, 0) });
      cursorY -= lineHeight;
    }
    cursorY -= paragraphSpacing;
  }

  return { page, y: cursorY };
}

export function drawAssinaturas(
  pdf: PDFDocument,
  startPage: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  startY: number,
  empregadora: string,
  empregado: string,
): void {
  let page = startPage;
  let y = startY;

  if (y < 200) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 740;
  }

  page.drawLine({ start: { x: 130, y }, end: { x: 465, y }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
  const empText = empregadora.toUpperCase();
  page.drawText(empText, {
    x: (PAGE_WIDTH - bold.widthOfTextAtSize(empText, 10)) / 2,
    y: y - 16,
    size: 10,
    font: bold,
  });
  y -= 58;

  page.drawLine({ start: { x: 130, y }, end: { x: 465, y }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
  const candText = empregado.toUpperCase();
  page.drawText(candText, {
    x: (PAGE_WIDTH - bold.widthOfTextAtSize(candText, 10)) / 2,
    y: y - 16,
    size: 10,
    font: bold,
  });
  y -= 50;

  page.drawText('Testemunhas:', { x: 70, y, size: 10, font: regular });
  y -= 26;
  page.drawText('1.', { x: 70, y, size: 10, font: regular });
  page.drawLine({ start: { x: 82, y }, end: { x: 270, y }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('2.', { x: 320, y, size: 10, font: regular });
  page.drawLine({ start: { x: 332, y }, end: { x: 520, y }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  page.drawText('Nome completo:', { x: 70, y, size: 9, font: regular });
  page.drawText('Nome completo:', { x: 320, y, size: 9, font: regular });
}

/**
 * Desenha blocos de assinatura eletrônica para contratos digitais.
 * Substitui as linhas de assinatura manual e campo de testemunhas.
 */
export function drawAssinaturasEletronicas(
  pdf: PDFDocument,
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  startY: number,
  empregadora: string,
  empregado: string,
): void {
  let currentPage = page;
  let y = startY;

  if (y < 100) {
    currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 700;
  }

  const blockHeight = 46;
  const blockGap = 12;
  const blockWidth = 221.5;
  const blockY = y - blockHeight + 14;
  const empregadoraX = 70;
  const empregadoX = empregadoraX + blockWidth + blockGap;

  currentPage.drawRectangle({
    x: empregadoraX,
    y: blockY,
    width: blockWidth,
    height: blockHeight,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.5,
  });
  currentPage.drawText('EMPREGADORA — Assinado eletronicamente', {
    x: empregadoraX + 8, y: y + 6, size: 7, font: bold, color: rgb(0.25, 0.25, 0.25),
  });
  currentPage.drawText(empregadora.toUpperCase(), {
    x: empregadoraX + 8, y: y - 6, size: 8, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
  currentPage.drawText('Certificado A1 | Admissão Digital', {
    x: empregadoraX + 8, y: y - 18, size: 7, font: regular, color: rgb(0.45, 0.45, 0.45),
  });

  currentPage.drawRectangle({
    x: empregadoX,
    y: blockY,
    width: blockWidth,
    height: blockHeight,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.5,
  });
  currentPage.drawText('EMPREGADO — Assinado eletronicamente', {
    x: empregadoX + 8, y: y + 6, size: 7, font: bold, color: rgb(0.25, 0.25, 0.25),
  });
  currentPage.drawText(empregado.toUpperCase(), {
    x: empregadoX + 8, y: y - 6, size: 8, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
  currentPage.drawText('OTP, biometria ou facial | Admissão Digital', {
    x: empregadoX + 8, y: y - 18, size: 7, font: regular, color: rgb(0.45, 0.45, 0.45),
  });
}

export function drawFooter(page: PDFPage): void {
  page.drawLine({ start: { x: 36, y: 34 }, end: { x: 559, y: 34 }, thickness: 2, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: 36, y: 30 }, end: { x: 559, y: 30 }, thickness: 0.7, color: rgb(0, 0, 0) });
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}
