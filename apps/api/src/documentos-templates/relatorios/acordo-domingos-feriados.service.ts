import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import { SeniorApiService } from '../../general/senior-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TEXTO_ASSINATURA_ELETRONICA,
  drawAssinaturasEletronicas,
  drawFooter,
  drawHeader,
  drawParagraphs,
} from '../pdf-render.utils';

type CandidaturaAcordo = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

interface FilialAdmissao {
  NUMCGC: string | number;
  RAZSOC: string;
  TIPLGR: string;
  ENDFIL: string;
  ENDNUM: string;
  CODBAI: number;
  NOMBAI: string;
  CODCEP: number;
  CODCID: number;
  NOMCID: string;
  CODEST: string;
}

@Injectable()
export class AcordoDomingosFeriadosService {
  static readonly CODIGO = 'acordo-domingos-feriados';
  static readonly NOME = 'Acordo para Trabalho aos Domingos e Feriados';

  private readonly logger = new Logger(AcordoDomingosFeriadosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seniorApi: SeniorApiService,
  ) {}

  async gerarPdfById(candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, requisicao: { include: { empresa: true } } },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    return this.gerarPdf(candidatura);
  }

  async gerarPdf(candidatura: CandidaturaAcordo): Promise<Buffer> {
    const numemp = parseInt(candidatura.requisicao.empresa?.codigoEmpresaSenior ?? '1', 10);
    const codfil = candidatura.requisicao.filial ?? 0;

    const filial = await this.buscarFilial(numemp, codfil);

    const empresaNome =
      filial?.RAZSOC ?? candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const empresaCnpj = filial ? this.formatarCnpj(filial.NUMCGC) : '41.930.199/0026-92';
    const empresaCidade = filial?.NOMCID ?? 'Governador Valadares';
    const empresaEndereco = filial
      ? `${filial.TIPLGR} ${filial.ENDFIL}, ${filial.ENDNUM} - ${filial.NOMBAI}`
      : 'MARECHAL FLORIANO, 1527 - CENTRO';

    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const candidatoCpf = this.formatarCpf(candidatura.candidato.cpf);
    const candidatoEndereco = this.montarEnderecoResidencial(candidatura.candidato);

    const dataAdmissao =
      candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();

    const pdf = await PDFDocument.create();
    pdf.setTitle(AcordoDomingosFeriadosService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharAcordo(pdf, page, regular, bold, {
      empresaNome,
      empresaCnpj,
      empresaCidade,
      empresaEndereco,
      candidatoNome,
      candidatoCpf,
      candidatoEndereco,
      dataAdmissao,
    });

    return Buffer.from(await pdf.save());
  }

  private async buscarFilial(numemp: number, codfil: number): Promise<FilialAdmissao | null> {
    if (!codfil) return null;
    try {
      return await this.seniorApi.get<FilialAdmissao | null>(
        `/admissao/filial?numemp=${numemp}&codfil=${codfil}`,
      );
    } catch (err) {
      this.logger.warn(`Falha ao buscar filial ${codfil}: ${String(err)}`);
      return null;
    }
  }

  private montarEnderecoResidencial(
    candidato: CandidaturaAcordo['candidato'],
  ): string | null {
    const { tipoLogradouro, endereco, numero, bairroNome } = candidato;
    if (!endereco) return null;
    const partes: string[] = [];
    if (tipoLogradouro) partes.push(tipoLogradouro);
    partes.push(endereco);
    if (numero) partes.push(`, ${numero}`);
    if (bairroNome) partes.push(` - ${bairroNome}`);
    return partes.join(' ');
  }

  private formatarCnpj(cnpj: string | number): string {
    const d = String(cnpj).replace(/\D/g, '').padStart(14, '0');
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private formatarCpf(cpf: string): string {
    const d = cpf.replace(/\D/g, '');
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  private desenharAcordo(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    data: {
      empresaNome: string;
      empresaCnpj: string;
      empresaCidade: string;
      empresaEndereco: string;
      candidatoNome: string;
      candidatoCpf: string;
      candidatoEndereco: string | null;
      dataAdmissao: Date;
    },
  ): void {
    let y = drawHeader(page, bold);

    const title = AcordoDomingosFeriadosService.NOME;
    page.drawText(title, {
      x: (PAGE_WIDTH - bold.widthOfTextAtSize(title, 11)) / 2,
      y,
      size: 11,
      font: bold,
    });
    y -= 28;

    const enderecoEmpregado = data.candidatoEndereco
      ? ` residente na ${data.candidatoEndereco}`
      : '';

    const conteudo = [
      `Pelo presente instrumento de acordo de trabalho, firmado entre a Empresa ${data.empresaNome}, CNPJ ${data.empresaCnpj} com sede em ${data.empresaCidade} na ${data.empresaEndereco} e seu empregado(a) ${data.candidatoNome}${enderecoEmpregado}, portador(a) do CPF n\xba ${data.candidatoCpf}. Fica acordado que aos domingos e feriados haver\u00e1 jornada de trabalho de acordo com a escala.`,
      TEXTO_ASSINATURA_ELETRONICA,
      `${data.empresaCidade}, ${this.formatarData(data.dataAdmissao)}.`,
    ].join('\n');

    const { page: lastPage, y: lastY } = drawParagraphs(pdf, page, conteudo, regular, y, 10, {
      lineHeight: 14,
      paragraphSpacing: 14,
      blankLineHeight: 0,
      x: 42,
      maxWidth: 511,
    });

    drawAssinaturasEletronicas(
      pdf,
      lastPage,
      regular,
      bold,
      lastY - 20,
      data.empresaNome,
      data.candidatoNome,
    );
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
