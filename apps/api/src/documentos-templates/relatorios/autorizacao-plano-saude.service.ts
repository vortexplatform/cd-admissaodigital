import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawAssinaturasEletronicas,
  drawFooter,
  drawHeader,
  drawParagraphs,
  embedLogo,
  getResponsavelLegalParaAssinatura,
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
    const empresaCidade = candidatura.requisicao.filialNome ?? 'Governador Valadares';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const candidatoCpf = this.formatarCpf(candidatura.candidato.cpf);
    const cargo = (
      candidatura.requisicao.cargoNome ??
      candidatura.requisicao.cargo ??
      'CARGO NÃO INFORMADO'
    ).toUpperCase();
    const dataAdmissao =
      candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();
    const filial = candidatura.requisicao.filial;
    const sindicato = this.getSindicato(filial);

    const pdf = await PDFDocument.create();
    pdf.setTitle(AutorizacaoPlanoSaudeService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdf);

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharAutorizacao(pdf, page, regular, bold, logo, {
      empresaNome,
      empresaCidade,
      candidatoNome,
      candidatoCpf,
      cargo,
      dataAdmissao,
      sindicato,
      responsavelNome: getResponsavelLegalParaAssinatura(
        candidatura.candidato.dataNascimento,
        candidatura.candidato.responsavelNome,
        dataAdmissao,
      ),
    });

    return Buffer.from(await pdf.save());
  }

  private getSindicato(filial: number | null): string {
    const filiaisSeci = new Set([13, 17, 22, 24]);
    if (filial != null && filiaisSeci.has(filial)) {
      return 'SECI – SIND. DOS EMPREGADOS COM. ATAC. VAREJ. ARM. TUR. HOS. AG. AUT. CART. IPATINGA';
    }
    return 'SINDICATO DOS EMPREGADOS NO COMERCIO DE TIMOTEO E CORONEL FABRICIANO – SECTEO – CF';
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
    logo: PDFImage,
    data: {
      empresaNome: string;
      empresaCidade: string;
      candidatoNome: string;
      candidatoCpf: string;
      cargo: string;
      dataAdmissao: Date;
      sindicato: string;
      responsavelNome?: string;
    },
  ): void {
    let y = drawHeader(page, logo, AutorizacaoPlanoSaudeService.NOME, bold);
    y -= 10;

    // Campos identificação
    this.drawField(page, regular, bold, 'Nome:', data.candidatoNome, 70, y, 10);
    y -= 22;
    this.drawField(page, regular, bold, 'Cargo:', data.cargo, 70, y, 10);
    y -= 22;
    this.drawField(page, regular, bold, 'CPF:', data.candidatoCpf, 70, y, 10);
    y -= 26;

    // Corpo do texto
    const conteudo = [
      `Declaro para os devidos fins que recebi todas as orientações e regras do Plano de Saúde, estando ciente que devo utilizá-lo de forma consciente, bem como autorizo a empresa a efetuar mensalmente desconto em meus proventos dos valores relativos ao custeio sob minha responsabilidade, tudo conforme estabelecido pela cláusula da convenção coletiva firmada pelo sindicato de minha categoria, qual seja o ${data.sindicato}, tendo conhecimento que os valores poderão sofrer alterações periódicas.`,
      'Declaro ainda, que fui cientificado que a hipótese de rescisão do meu contrato de trabalho, por força da Lei 9656/98, poderei permanecer no Plano nos termos e condições previstas na Lei nº 9656/98, desde que assuma o custeio integral da contribuição mensal.',
      'As partes convencionam, para todos os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, que o presente instrumento é celebrado e assinado por meio eletrônico, reconhecendo-o desde já como válido, autêntico, íntegro e eficaz, com força de instrumento particular, ainda que a assinatura do EMPREGADO seja produzida por processo de certificação não vinculado à ICP-Brasil. A assinatura do EMPREGADO será colhida mediante assinatura eletrônica avançada, na acepção do art. 4º, II, da Lei nº 14.063/2020, por OTP, verificação biométrica e/ou reconhecimento facial com prova de vivacidade, disponibilizados pela plataforma Admissão Digital. A EMPREGADORA firmará o instrumento por seu representante legal ou procurador com poderes bastantes, mediante certificado digital padrão ICP-Brasil. O EMPREGADO declara que teve acesso prévio e integral ao teor deste instrumento antes de assiná-lo e que os dados usados para autenticação são de sua titularidade e uso pessoal. Integram este instrumento o comprovante de assinatura eletrônica e a respectiva trilha de auditoria, com identificação, método, data, hora, IP, dispositivo, código de verificação e hashes do documento antes e após a assinatura.',
    ].join('\n');

    const { page: lastPage, y: lastY } = drawParagraphs(pdf, page, conteudo, regular, y, 10, {
      lineHeight: 14,
      paragraphSpacing: 14,
      blankLineHeight: 0,
      x: 42,
      maxWidth: 511,
    });

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(data.dataAdmissao);
    lastPage.drawText(`${data.empresaCidade}, ${dataFormatada}.`, {
      x: 42, y: lastY - 10, size: 10, font: regular,
    });

    drawAssinaturasEletronicas(
      pdf,
      lastPage,
      regular,
      bold,
      lastY - 30,
      data.empresaNome,
      data.candidatoNome,
      data.responsavelNome,
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
