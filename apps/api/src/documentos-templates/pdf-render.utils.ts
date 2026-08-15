import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;

function resolveLogoPath(): string {
  // __dirname pode ser dist/ ou src/, tenta ambos
  const candidate = join(__dirname, 'assets', 'logo_coelhodiniz.png');
  if (existsSync(candidate)) return candidate;
  // fallback: resolve a partir de src/ quando rodando de dist/
  return join(__dirname, '..', 'src', 'documentos-templates', 'assets', 'logo_coelhodiniz.png');
}

const LOGO_PATH = resolveLogoPath();

export async function embedLogo(pdf: PDFDocument): Promise<PDFImage> {
  const logoBytes = await readFile(LOGO_PATH);
  return pdf.embedPng(logoBytes);
}

export function getResponsavelLegalParaAssinatura(
  dataNascimento: Date | null,
  responsavelNome: string | null,
  dataReferencia: Date,
): string | undefined {
  if (!dataNascimento || !responsavelNome) return undefined;

  let idade = dataReferencia.getUTCFullYear() - dataNascimento.getUTCFullYear();
  const mes = dataReferencia.getUTCMonth() - dataNascimento.getUTCMonth();
  if (mes < 0 || (mes === 0 && dataReferencia.getUTCDate() < dataNascimento.getUTCDate())) {
    idade -= 1;
  }
  return idade < 18 ? responsavelNome : undefined;
}

export function drawHeader(
  page: PDFPage,
  logo: PDFImage,
  title?: string,
  bold?: PDFFont,
): number {
  const { height } = page.getSize();
  const logoWidth = 150;
  const logoHeight = (73 / 403) * logoWidth;
  const logoY = height - 24 - logoHeight;
  page.drawImage(logo, {
    x: 36,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });
  if (title && bold) {
    const titleX = 36 + logoWidth + 14;
    const titleY = logoY + logoHeight / 2 - 5;
    page.drawText(title, {
      x: titleX,
      y: titleY,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.12, 0.12),
    });
  }
  return height - 40 - logoHeight;
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
  responsavel?: string,
): void {
  if (responsavel) {
    drawAssinaturasEletronicasMenor(pdf, page, regular, bold, startY, empregadora, empregado, responsavel);
    return;
  }

  let currentPage = page;
  let y = startY;

  const blockHeight = 38;

  if (y < blockHeight + 50) {
    currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 740;
  }

  const blockGap = 16;
  const blockWidth = 232;
  const empregadoraX = 56;
  const empregadoX = empregadoraX + blockWidth + blockGap;

  // — Bloco EMPREGADORA —
  const empBlockY = y - blockHeight;
  currentPage.drawRectangle({
    x: empregadoraX, y: empBlockY, width: blockWidth, height: blockHeight,
    color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.7,
  });
  currentPage.drawRectangle({
    x: empregadoraX, y: empBlockY, width: 3, height: blockHeight,
    color: rgb(0.13, 0.37, 0.69),
  });
  currentPage.drawText('EMPREGADORA  •  Assinado eletronicamente', {
    x: empregadoraX + 12, y: y - 11, size: 6, font: regular, color: rgb(0.45, 0.45, 0.45),
  });
  currentPage.drawText(empregadora.toUpperCase(), {
    x: empregadoraX + 12, y: y - 23, size: 7, font: bold, color: rgb(0.12, 0.12, 0.12),
  });
  currentPage.drawText('Certificado ICP-Brasil  •  Admissão Digital', {
    x: empregadoraX + 12, y: y - 34, size: 5.5, font: regular, color: rgb(0.6, 0.6, 0.6),
  });

  // — Bloco EMPREGADO —
  const candBlockY = y - blockHeight;
  currentPage.drawRectangle({
    x: empregadoX, y: candBlockY, width: blockWidth, height: blockHeight,
    color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.7,
  });
  currentPage.drawRectangle({
    x: empregadoX, y: candBlockY, width: 3, height: blockHeight,
    color: rgb(0.18, 0.55, 0.34),
  });
  currentPage.drawText('EMPREGADO  •  Assinado eletronicamente', {
    x: empregadoX + 12, y: y - 11, size: 6, font: regular, color: rgb(0.45, 0.45, 0.45),
  });
  currentPage.drawText(empregado.toUpperCase(), {
    x: empregadoX + 12, y: y - 23, size: 7, font: bold, color: rgb(0.12, 0.12, 0.12),
  });
  currentPage.drawText('OTP / Biometria / Reconhecimento facial', {
    x: empregadoX + 12, y: y - 34, size: 5.5, font: regular, color: rgb(0.6, 0.6, 0.6),
  });
}

/**
 * Desenha blocos de assinatura eletrônica para contratos de menores (3 signatários).
 * Empregadora, Empregado(a) e Responsável Legal.
 */
export function drawAssinaturasEletronicasMenor(
  pdf: PDFDocument,
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  startY: number,
  empregadora: string,
  empregado: string,
  responsavel: string,
): void {
  let currentPage = page;
  let y = startY;

  const blockHeight = 38;

  if (y < blockHeight + 50) {
    currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 740;
  }

  const blockGap = 10;
  const blockWidth = 154;
  const leftX = 56;
  const middleX = leftX + blockWidth + blockGap;
  const rightX = middleX + blockWidth + blockGap;

  const empBlockY = y - blockHeight;
  currentPage.drawRectangle({
    x: leftX, y: empBlockY, width: blockWidth, height: blockHeight,
    color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.7,
  });
  currentPage.drawRectangle({
    x: leftX, y: empBlockY, width: 3, height: blockHeight,
    color: rgb(0.13, 0.37, 0.69),
  });
  currentPage.drawText('EMPREGADORA  •  Assinado eletronicamente', {
    x: leftX + 8, y: y - 11, size: 4.7, font: regular, color: rgb(0.45, 0.45, 0.45),
  });
  currentPage.drawText(empregadora.toUpperCase(), {
    x: leftX + 8, y: y - 23, size: 5.5, font: bold, color: rgb(0.12, 0.12, 0.12),
  });
  currentPage.drawText('Certificado ICP-Brasil  •  Admissão Digital', {
    x: leftX + 8, y: y - 34, size: 4.4, font: regular, color: rgb(0.6, 0.6, 0.6),
  });

  const candBlockY = y - blockHeight;
  currentPage.drawRectangle({
    x: middleX, y: candBlockY, width: blockWidth, height: blockHeight,
    color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.7,
  });
  currentPage.drawRectangle({
    x: middleX, y: candBlockY, width: 3, height: blockHeight,
    color: rgb(0.18, 0.55, 0.34),
  });
  currentPage.drawText('EMPREGADO  •  Assinado eletronicamente', {
    x: middleX + 8, y: y - 11, size: 4.7, font: regular, color: rgb(0.45, 0.45, 0.45),
  });
  currentPage.drawText(empregado.toUpperCase(), {
    x: middleX + 8, y: y - 23, size: 5.5, font: bold, color: rgb(0.12, 0.12, 0.12),
  });
  currentPage.drawText('OTP / Biometria / Reconhecimento facial', {
    x: middleX + 8, y: y - 34, size: 4.4, font: regular, color: rgb(0.6, 0.6, 0.6),
  });

  const respBlockY = y - blockHeight;
  currentPage.drawRectangle({
    x: rightX, y: respBlockY, width: blockWidth, height: blockHeight,
    color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.7,
  });
  currentPage.drawRectangle({
    x: rightX, y: respBlockY, width: 3, height: blockHeight,
    color: rgb(0.55, 0.27, 0.07),
  });
  currentPage.drawText('RESPONSÁVEL LEGAL  •  Assinado eletronicamente', {
    x: rightX + 8, y: y - 11, size: 4.7, font: regular, color: rgb(0.45, 0.45, 0.45),
  });
  currentPage.drawText(responsavel.toUpperCase(), {
    x: rightX + 8, y: y - 23, size: 5.5, font: bold, color: rgb(0.12, 0.12, 0.12),
  });
  currentPage.drawText('OTP  •  Assistente do menor  •  Admissão Digital', {
    x: rightX + 8, y: y - 34, size: 4.4, font: regular, color: rgb(0.6, 0.6, 0.6),
  });
}

export function drawFooter(_page: PDFPage): void {
  void _page;
  // Rodapé sem bordas — mantido como noop para compatibilidade
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
