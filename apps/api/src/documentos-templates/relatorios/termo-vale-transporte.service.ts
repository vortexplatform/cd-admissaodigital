import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { SeniorApiService } from '../../general/senior-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawAssinaturasEletronicas,
  drawHeader,
  drawParagraphs,
  embedLogo,
  getResponsavelLegalParaAssinatura,
  wrapText,
} from '../pdf-render.utils';

type CandidaturaValeTransporte = Prisma.CandidaturaGetPayload<{
  include: {
    candidato: { include: { valeTransportes: true } };
    requisicao: { include: { empresa: true } };
  };
}>;

interface FilialAdmissao {
  NUMCGC: string | number;
  RAZSOC: string;
  TIPLGR: string;
  ENDFIL: string;
  ENDNUM: string;
  NOMBAI: string;
  CODCEP: number;
  NOMCID: string;
  CODEST: string;
}

const DIAS_UTEIS_MENSAIS = 22;

@Injectable()
export class TermoValeTransporteService {
  static readonly CODIGO = 'termo-opcao-vale-transporte';
  static readonly NOME = 'Termo de Opção, Declaração e Autorização - Vale-Transporte';

  private readonly logger = new Logger(TermoValeTransporteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seniorApi: SeniorApiService,
  ) {}

  async gerarPdfById(candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        candidato: { include: { valeTransportes: true } },
        requisicao: { include: { empresa: true } },
      },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    return this.gerarPdf(candidatura);
  }

  async gerarPdf(candidatura: CandidaturaValeTransporte): Promise<Buffer> {
    const filial = await this.buscarFilial(candidatura);
    const empresaNome = filial?.RAZSOC ?? candidatura.requisicao.empresa?.nome ?? 'EMPREGADORA';
    const empresaCnpj = filial ? this.formatarCnpj(filial.NUMCGC) : 'NÃO INFORMADO';
    const empresaEndereco = filial
      ? `${filial.TIPLGR} ${filial.ENDFIL}, ${filial.ENDNUM} - ${filial.NOMBAI}, ${filial.NOMCID}/${filial.CODEST}, CEP ${this.formatarCep(filial.CODCEP)}`
      : 'NÃO INFORMADO';
    const cidade = filial?.NOMCID ?? candidatura.requisicao.filialNome ?? 'Governador Valadares';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const candidatoCpf = this.formatarCpf(candidatura.candidato.cpf);
    const cargo = (candidatura.requisicao.cargoNome ?? candidatura.requisicao.cargo ?? 'NÃO INFORMADO').toUpperCase();
    const candidatoEndereco = this.montarEndereco(candidatura.candidato);
    const dataDocumento = candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();

    const pdf = await PDFDocument.create();
    pdf.setTitle(TermoValeTransporteService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdf);
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const { page: lastPage, y } = this.desenharTermo(pdf, page, regular, bold, logo, {
      empresaNome,
      empresaCnpj,
      empresaEndereco,
      candidatoNome,
      candidatoCpf,
      cargo,
      candidatoEndereco,
      cidade,
      dataDocumento,
      vales: candidatura.candidato.valeTransportes,
    });
    drawAssinaturasEletronicas(
      pdf,
      lastPage,
      regular,
      bold,
      y,
      empresaNome,
      candidatoNome,
      getResponsavelLegalParaAssinatura(
        candidatura.candidato.dataNascimento,
        candidatura.candidato.responsavelNome,
        dataDocumento,
      ),
    );

    return Buffer.from(await pdf.save());
  }

  private async buscarFilial(candidatura: CandidaturaValeTransporte): Promise<FilialAdmissao | null> {
    const numemp = Number(candidatura.requisicao.empresa?.codigoEmpresaSenior ?? 1);
    const codfil = candidatura.requisicao.filial;
    if (!codfil) return null;
    try {
      return await this.seniorApi.get<FilialAdmissao>(`/admissao/filial?numemp=${numemp}&codfil=${codfil}`);
    } catch (error) {
      this.logger.warn(`Falha ao buscar filial ${codfil}: ${String(error)}`);
      return null;
    }
  }

  private desenharTermo(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    logo: PDFImage,
    data: {
      empresaNome: string;
      empresaCnpj: string;
      empresaEndereco: string;
      candidatoNome: string;
      candidatoCpf: string;
      cargo: string;
      candidatoEndereco: string;
      cidade: string;
      dataDocumento: Date;
      vales: Array<{ tipoTransporte: string; tipoTrajeto: string; transporteUsado: string; tarifaUnitaria: Prisma.Decimal; valesPorDia: number }>;
    },
  ): { page: PDFPage; y: number } {
    let y = drawHeader(page, logo, TermoValeTransporteService.NOME, bold) - 12;
    page.drawText('(Lei nº 7.418/85, Lei nº 7.619/87 e Decreto nº 95.247/87)', { x: 70, y, size: 8, font: regular });
    y -= 22;

    y = this.drawSectionTitle(page, bold, 'I - IDENTIFICAÇÃO', y);
    y = this.drawLine(page, regular, `Empregadora: ${data.empresaNome} | CNPJ: ${data.empresaCnpj}`, y);
    y = this.drawLine(page, regular, `Endereço: ${data.empresaEndereco}`, y);
    y = this.drawLine(page, regular, `Empregado: ${data.candidatoNome} | CPF: ${data.candidatoCpf}`, y);
    y = this.drawLine(page, regular, `Cargo: ${data.cargo} | Endereço residencial: ${data.candidatoEndereco}`, y) - 8;

    y = this.drawSectionTitle(page, bold, 'II - OPÇÃO', y);
    const optou = data.vales.length > 0;
    y = this.drawWrappedLine(page, regular, `${optou ? '[X]' : '[ ]'} OPTO pelo recebimento do vale-transporte, na forma abaixo declarada.`, y);
    y = this.drawWrappedLine(page, regular, `${optou ? '[ ]' : '[X]'} NÃO OPTO pelo vale-transporte, declarando que não utilizo transporte público coletivo no deslocamento residência-trabalho e vice-versa.`, y);
    page.drawText('Motivo: Admissão.', { x: 70, y, size: 9, font: regular });
    y -= 24;

    y = this.drawSectionTitle(page, bold, 'III - DECLARAÇÃO DE TRAJETO', y);
    if (optou) {
      y = this.drawTable(page, regular, bold, data.vales, y - 10);
    } else {
      page.drawText('Não se aplica, pois o empregado não optou pelo benefício.', { x: 70, y, size: 9, font: regular });
      y -= 18;
    }

    let currentPage = page;
    let currentY = y;
    const texto = 'Declaro que as linhas e os meios de transporte acima são os mais adequados ao meu deslocamento e que as informações prestadas são verdadeiras e atuais.';
    ({ page: currentPage, y: currentY } = drawParagraphs(pdf, currentPage, texto, regular, currentY, 9, { lineHeight: 12, paragraphSpacing: 8, x: 70, maxWidth: 455 }));

    ({ page: currentPage, y: currentY } = this.drawLegalSection(
      pdf,
      currentPage,
      regular,
      bold,
      'IV - AUTORIZAÇÃO DE DESCONTO',
      'Autorizo o desconto mensal em folha do valor equivalente a até 6% (seis por cento) do meu salário básico, destinado a cobrir o fornecimento dos vales-transporte por mim utilizados.',
      currentY,
    ));
    ({ page: currentPage, y: currentY } = this.drawLegalSection(
      pdf,
      currentPage,
      regular,
      bold,
      'V - COMPROMISSOS E CIÊNCIA',
      'Utilizar os vales-transporte exclusivamente no deslocamento residência-trabalho e vice-versa; comunicar imediatamente qualquer alteração de endereço residencial ou de meio de transporte, ciente de que a ausência de comunicação acarreta a suspensão do benefício até a regularização; renovar anualmente esta declaração ou sempre que houver alteração do endereço residencial ou meio de transporte utilizado, sob pena de suspensão do benefício, na forma do art. 7º, § 1º, do Decreto nº 95.247/87; estar ciente de que a prestação de declaração falsa ou o uso indevido do benefício constituem falta grave, nos termos do art. 7º, § 3º, do Decreto nº 95.247/87 c/c art. 482 da CLT.',
      currentY,
    ));
    ({ page: currentPage, y: currentY } = this.drawLegalSection(
      pdf,
      currentPage,
      regular,
      bold,
      'VI - FORMA ELETRÔNICA',
      'As partes convencionam, para todos os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, que o presente instrumento é celebrado e assinado por meio eletrônico, reconhecendo-o desde já como válido, autêntico, íntegro e eficaz, com força de instrumento particular, ainda que a assinatura do EMPREGADO seja produzida por processo de certificação não vinculado à ICP-Brasil. A assinatura do EMPREGADO será colhida mediante assinatura eletrônica avançada, na acepção do art. 4º, II, da Lei nº 14.063/2020, por OTP, verificação biométrica e/ou reconhecimento facial com prova de vivacidade, disponibilizados pela plataforma Admissão Digital. A EMPREGADORA firmará o instrumento por seu representante legal ou procurador com poderes bastantes, mediante certificado digital padrão ICP-Brasil. O EMPREGADO declara que teve acesso prévio e integral ao teor deste instrumento antes de assiná-lo e que os dados usados para autenticação são de sua titularidade e uso pessoal. Integram este instrumento o comprovante de assinatura eletrônica e a respectiva trilha de auditoria, com identificação, método, data, hora, IP, dispositivo, código de verificação e hashes do documento antes e após a assinatura.',
      currentY,
    ));
    const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(data.dataDocumento);
    currentPage.drawText(`${data.cidade}, ${dataFormatada}.`, { x: 70, y: currentY - 4, size: 9, font: regular });
    return { page: currentPage, y: currentY - 28 };
  }

  private drawLegalSection(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    title: string,
    body: string,
    y: number,
  ): { page: PDFPage; y: number } {
    let currentPage = page;
    let currentY = y;
    if (currentY < 90) {
      currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = 785;
    }
    currentY = this.drawSectionTitle(currentPage, bold, title, currentY);
    return drawParagraphs(pdf, currentPage, body, regular, currentY, 9, {
      lineHeight: 12,
      paragraphSpacing: 8,
      x: 70,
      maxWidth: 455,
    });
  }

  private drawSectionTitle(page: PDFPage, bold: PDFFont, title: string, y: number): number {
    page.drawText(title, { x: 70, y, size: 10, font: bold, color: rgb(0.12, 0.12, 0.12) });
    return y - 16;
  }

  private drawLine(page: PDFPage, font: PDFFont, text: string, y: number): number {
    return this.drawWrappedLine(page, font, text, y);
  }

  private drawWrappedLine(page: PDFPage, font: PDFFont, text: string, y: number): number {
    const lines = wrapText(text, font, 9, 455);
    for (const line of lines) {
      page.drawText(line, { x: 70, y, size: 9, font });
      y -= 13;
    }
    return y;
  }

  private drawTable(
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    vales: Array<{
      tipoTransporte: string;
      tipoTrajeto: string;
      transporteUsado: string;
      tarifaUnitaria: Prisma.Decimal;
      valesPorDia: number;
    }>,
    y: number,
  ): number {
    const columns = [70, 165, 245, 365, 445];
    const widths = [90, 75, 115, 75, 82];
    const headers = ['Trecho', 'Modalidade', 'Empresa / Linha', 'Tarifa', 'Vales/dia'];
    page.drawRectangle({ x: 68, y: y - 5, width: 459, height: 22, color: rgb(0.92, 0.95, 0.98) });
    headers.forEach((header, index) => page.drawText(header, { x: columns[index], y, size: 7, font: bold }));
    y -= 18;
    let totalDia = 0;
    let totalMensal = 0;
    for (const vale of vales) {
      const trecho = vale.tipoTrajeto === 'RESIDENCIA_TRABALHO' ? 'Residência -> Trabalho' : 'Trabalho -> Residência';
      const modalidade = vale.tipoTransporte.replaceAll('_', ' ');
      const tarifa = Number(vale.tarifaUnitaria);
      totalDia += vale.valesPorDia;
      totalMensal += tarifa * vale.valesPorDia * DIAS_UTEIS_MENSAIS;
      const values = [trecho, modalidade, vale.transporteUsado, this.formatarMoeda(tarifa), String(vale.valesPorDia)];
      const lines = values.map((value, index) => wrapText(value, regular, 7, widths[index]));
      const rowHeight = Math.max(...lines.map((cellLines) => cellLines.length)) * 10 + 4;
      lines.forEach((cellLines, index) => {
        cellLines.forEach((line, lineIndex) => {
          page.drawText(line, { x: columns[index], y: y - lineIndex * 10, size: 7, font: regular });
        });
      });
      y -= rowHeight;
    }
    page.drawText(`Total diário: ${totalDia} vales | Total mensal estimado: ${totalDia * DIAS_UTEIS_MENSAIS} vales | Valor mensal estimado: ${this.formatarMoeda(totalMensal)}`, { x: 70, y: y - 2, size: 8, font: bold });
    return y - 20;
  }

  private montarEndereco(candidato: CandidaturaValeTransporte['candidato']): string {
    const partes = [candidato.tipoLogradouro, candidato.endereco, candidato.numero, candidato.complemento, candidato.bairroNome, candidato.cidadeNome, candidato.estadoEndereco, candidato.cep ? `CEP ${candidato.cep}` : undefined].filter(Boolean);
    return partes.length ? partes.join(', ') : 'NÃO INFORMADO';
  }

  private formatarCpf(cpf: string | null): string {
    const digits = (cpf ?? '').replace(/\D/g, '');
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') || 'NÃO INFORMADO';
  }

  private formatarCnpj(cnpj: string | number): string {
    const digits = String(cnpj).replace(/\D/g, '').padStart(14, '0');
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private formatarCep(cep: string | number): string {
    return String(cep).replace(/\D/g, '').padStart(8, '0').replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }
}
