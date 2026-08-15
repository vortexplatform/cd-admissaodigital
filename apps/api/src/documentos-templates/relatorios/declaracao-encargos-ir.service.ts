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

type CandidaturaEncargosIR = Prisma.CandidaturaGetPayload<{
  include: {
    candidato: { include: { dependentes: true } };
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

@Injectable()
export class DeclaracaoEncargosIrService {
  static readonly CODIGO = 'declaracao-encargos-ir';
  static readonly NOME = 'Declaração de Encargos p/ Imposto de Renda';

  private readonly logger = new Logger(DeclaracaoEncargosIrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seniorApi: SeniorApiService,
  ) {}

  async gerarPdfById(candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        candidato: { include: { dependentes: true } },
        requisicao: { include: { empresa: true } },
      },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    return this.gerarPdf(candidatura);
  }

  async gerarPdf(candidatura: CandidaturaEncargosIR): Promise<Buffer> {
    const filial = await this.buscarFilial(candidatura);
    const empresaNome = filial?.RAZSOC ?? candidatura.requisicao.empresa?.nome ?? 'EMPREGADORA';
    const cidade = filial?.NOMCID ?? candidatura.requisicao.filialNome ?? 'Governador Valadares';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const candidatoCpf = this.formatarCpf(candidatura.candidato.cpf);
    const matricula = candidatura.matricula ?? '';
    const cargo = (candidatura.requisicao.cargoNome ?? candidatura.requisicao.cargo ?? 'NÃO INFORMADO').toUpperCase();
    const departamento = candidatura.requisicao.ccustoNome ?? candidatura.requisicao.postoTrabalhoNome ?? '';
    const estadoCivil = this.formatarEstadoCivil(candidatura.candidato.estadoCivil);
    const endereco = candidatura.candidato.endereco ?? '';
    const numero = candidatura.candidato.numero ?? '';
    const bairro = candidatura.candidato.bairroNome ?? '';
    const dataDocumento = candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();
    const dependentes = candidatura.candidato.dependentes;

    const pdf = await PDFDocument.create();
    pdf.setTitle(DeclaracaoEncargosIrService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdf);
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const { page: lastPage, y } = this.desenharDeclaracao(pdf, page, regular, bold, logo, {
      candidatoNome,
      candidatoCpf,
      matricula,
      cargo,
      departamento,
      estadoCivil,
      endereco,
      numero,
      bairro,
      cidade,
      dataDocumento,
      dependentes,
      empresaNome,
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

  private async buscarFilial(candidatura: CandidaturaEncargosIR): Promise<FilialAdmissao | null> {
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

  private desenharDeclaracao(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    logo: PDFImage,
    data: {
      candidatoNome: string;
      candidatoCpf: string;
      matricula: string;
      cargo: string;
      departamento: string;
      estadoCivil: string;
      endereco: string;
      numero: string;
      bairro: string;
      cidade: string;
      dataDocumento: Date;
      dependentes: CandidaturaEncargosIR['candidato']['dependentes'];
      empresaNome: string;
    },
  ): { page: PDFPage; y: number } {
    let y = drawHeader(page, logo, DeclaracaoEncargosIrService.NOME, bold) - 8;

    // --- Dados do declarante ---
    y = this.drawLabelValue(page, bold, regular, 'Nome do Declarante:', data.candidatoNome, 70, y);
    page.drawText('Matrícula:', { x: 400, y: y + 14, size: 9, font: bold });
    page.drawText(data.matricula, { x: 460, y: y + 14, size: 9, font: regular });

    y = this.drawLabelValue(page, bold, regular, 'CPF:', data.candidatoCpf, 70, y);
    y = this.drawFieldRow(page, bold, regular, y, [
      { label: 'Endereço:', value: data.endereco, x: 70 },
      { label: 'Nº', value: data.numero, x: 340 },
      { label: 'Bairro:', value: data.bairro, x: 400 },
    ]);
    y = this.drawLabelValue(page, bold, regular, 'Estado Civil:', data.estadoCivil, 70, y);
    y = this.drawLabelValue(page, bold, regular, 'Departamento:', data.departamento, 70, y) - 6;

    // --- Texto introdutório ---
    const intro = 'Em obediência à legislação do Imposto de Renda, declaro pela presente que tenho como encargo de família, as pessoas assinaladas abaixo.';
    const introLines = wrapText(intro, regular, 9, 455);
    for (const line of introLines) {
      page.drawText(line, { x: 70, y, size: 9, font: regular });
      y -= 13;
    }
    y -= 6;

    // --- Tabela de dependentes ---
    y = this.drawTabelaDependentes(page, regular, bold, data.dependentes, y);
    y -= 10;

    // --- Declaração sob penas da lei ---
    let currentPage: PDFPage = page;
    let currentY = y;
    const declaracao = 'Declaro sob as penas da lei, que as informações aqui prestadas são verdadeiras e da minha inteira responsabilidade, não cabendo a V.Sa.(s) (fonte pagadora) qualquer responsabilidade perante a fiscalização.';
    const declLines = wrapText(declaracao, regular, 9, 455);
    for (const line of declLines) {
      currentPage.drawText(line, { x: 70, y: currentY, size: 9, font: regular });
      currentY -= 13;
    }
    currentY -= 6;

    // --- Cláusula de assinatura eletrônica ---
    const clausulaEletronica = 'As partes convencionam, para todos os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, que o presente instrumento é celebrado e assinado por meio eletrônico, reconhecendo-o desde já como válido, autêntico, íntegro e eficaz, com força de instrumento particular, ainda que a assinatura do EMPREGADO seja produzida por processo de certificação não vinculado à ICP-Brasil. A assinatura do EMPREGADO será colhida mediante assinatura eletrônica avançada, na acepção do art. 4º, II, da Lei nº 14.063/2020, por OTP, verificação biométrica e/ou reconhecimento facial com prova de vivacidade, disponibilizados pela plataforma Admissão Digital. A EMPREGADORA firmará o instrumento por seu representante legal ou procurador com poderes bastantes, mediante certificado digital padrão ICP-Brasil. O EMPREGADO declara que teve acesso prévio e integral ao teor deste instrumento antes de assiná-lo e que os dados usados para autenticação são de sua titularidade e uso pessoal. Integram este instrumento o comprovante de assinatura eletrônica e a respectiva trilha de auditoria, com identificação, método, data, hora, IP, dispositivo, código de verificação e hashes do documento antes e após a assinatura.';
    ({ page: currentPage, y: currentY } = drawParagraphs(pdf, currentPage, clausulaEletronica, regular, currentY, 9, {
      lineHeight: 12,
      paragraphSpacing: 8,
      x: 70,
      maxWidth: 455,
    }));
    currentY -= 10;

    // --- Cidade e data ---
    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(data.dataDocumento);
    const cidadeData = `${data.cidade}, ${dataFormatada}.`;
    const cidadeDataWidth = regular.widthOfTextAtSize(cidadeData, 9);
    if (currentY < 90) {
      currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = 785;
    }
    currentPage.drawText(cidadeData, { x: PAGE_WIDTH - 70 - cidadeDataWidth, y: currentY, size: 9, font: regular });
    currentY -= 20;

    // --- Rodapé ---
    const rodape = 'Sempre que ocorrer a alteração nesta declaração, a mesma deverá ser renovada.';
    const rodapeWidth = regular.widthOfTextAtSize(rodape, 8);
    currentPage.drawText(rodape, { x: (PAGE_WIDTH - rodapeWidth) / 2, y: currentY, size: 8, font: regular, color: rgb(0.3, 0.3, 0.3) });
    currentY -= 24;

    return { page: currentPage, y: currentY };
  }

  private drawLabelValue(
    page: PDFPage,
    bold: PDFFont,
    regular: PDFFont,
    label: string,
    value: string,
    x: number,
    y: number,
  ): number {
    page.drawText(label, { x, y, size: 9, font: bold });
    const labelWidth = bold.widthOfTextAtSize(label, 9);
    page.drawText(` ${value}`, { x: x + labelWidth, y, size: 9, font: regular });
    return y - 14;
  }

  private drawFieldRow(
    page: PDFPage,
    bold: PDFFont,
    regular: PDFFont,
    y: number,
    fields: Array<{ label: string; value: string; x: number }>,
  ): number {
    for (const field of fields) {
      page.drawText(field.label, { x: field.x, y, size: 9, font: bold });
      const labelWidth = bold.widthOfTextAtSize(field.label, 9);
      page.drawText(` ${field.value}`, { x: field.x + labelWidth, y, size: 9, font: regular });
    }
    return y - 14;
  }

  private drawTabelaDependentes(
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    dependentes: CandidaturaEncargosIR['candidato']['dependentes'],
    y: number,
  ): number {
    // Título da tabela
    page.drawRectangle({ x: 68, y: y - 5, width: 459, height: 18, color: rgb(0.92, 0.95, 0.98) });
    page.drawText('Dependente IR', { x: 72, y: y, size: 9, font: bold });
    y -= 20;

    // Cabeçalho das colunas
    const headerY = y;
    page.drawRectangle({ x: 68, y: headerY - 5, width: 459, height: 18, color: rgb(0.96, 0.96, 0.96) });
    page.drawText('Sim', { x: 72, y: headerY, size: 7, font: bold });
    page.drawText('Não', { x: 100, y: headerY, size: 7, font: bold });
    page.drawText('Nome Dependente', { x: 135, y: headerY, size: 7, font: bold });
    page.drawText('Parentesco', { x: 350, y: headerY, size: 7, font: bold });
    page.drawText('Nasc.', { x: 445, y: headerY, size: 7, font: bold });
    y -= 20;

    // Linhas de dados
    for (const dep of dependentes) {
      const sim = dep.dependenteIr ? '(  X  )' : '(      )';
      const nao = dep.dependenteIr ? '(      )' : '(  X  )';
      const nascimento = this.formatarDataNascimentoDependente(dep.dataNascimento);

      page.drawText(sim, { x: 68, y, size: 7, font: regular });
      page.drawText(nao, { x: 96, y, size: 7, font: regular });
      page.drawText(dep.nome.toUpperCase(), { x: 135, y, size: 7, font: regular });
      page.drawText(dep.descricaoGrauParentesco, { x: 350, y, size: 7, font: regular });
      page.drawText(nascimento, { x: 445, y, size: 7, font: regular });
      y -= 16;
    }

    // Borda da tabela
    const tableTop = headerY + 13 + 18;
    const tableBottom = y + 6;
    const tableHeight = tableTop - tableBottom;
    page.drawRectangle({
      x: 68,
      y: tableBottom,
      width: 459,
      height: tableHeight,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
      color: rgb(1, 1, 1),
      opacity: 0,
    });

    return y;
  }

  private formatarDataNascimentoDependente(data: Date | null): string {
    if (!data) return '-';
    const d = new Date(data);
    if (d.getUTCFullYear() === 1940 && d.getUTCMonth() === 0 && d.getUTCDate() === 1) return '-';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
  }

  private formatarCpf(cpf: string | null): string {
    const digits = (cpf ?? '').replace(/\D/g, '');
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') || 'NÃO INFORMADO';
  }

  private formatarEstadoCivil(estadoCivil: string | null): string {
    if (!estadoCivil) return '';
    const mapa: Record<string, string> = {
      SOLTEIRO: 'Solteiro',
      CASADO: 'Casado',
      DIVORCIADO: 'Divorciado',
      VIUVO: 'Viúvo',
      SEPARADO: 'Separado',
      UNIAO_ESTAVEL: 'União Estável',
    };
    return mapa[estadoCivil] ?? estadoCivil;
  }
}
