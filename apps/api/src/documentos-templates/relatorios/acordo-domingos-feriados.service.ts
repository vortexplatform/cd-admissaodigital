import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts } from 'pdf-lib';
import { SeniorApiService } from '../../general/senior-api.service';
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
    const logo = await embedLogo(pdf);

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharAcordo(pdf, page, regular, bold, logo, {
      empresaNome,
      empresaCnpj,
      empresaCidade,
      empresaEndereco,
      candidatoNome,
      candidatoCpf,
      candidatoEndereco,
      dataAdmissao,
      responsavelNome: getResponsavelLegalParaAssinatura(
        candidatura.candidato.dataNascimento,
        candidatura.candidato.responsavelNome,
        dataAdmissao,
      ),
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
    logo: PDFImage,
    data: {
      empresaNome: string;
      empresaCnpj: string;
      empresaCidade: string;
      empresaEndereco: string;
      candidatoNome: string;
      candidatoCpf: string;
      candidatoEndereco: string | null;
      dataAdmissao: Date;
      responsavelNome?: string;
    },
  ): void {
    const y = drawHeader(page, logo, AcordoDomingosFeriadosService.NOME, bold);

    const enderecoEmpregado = data.candidatoEndereco
      ? ` residente na ${data.candidatoEndereco}`
      : '';

    const conteudo = [
      `Pelo presente instrumento de acordo de trabalho, firmado entre a Empresa ${data.empresaNome}, CNPJ ${data.empresaCnpj} com sede em ${data.empresaCidade} na ${data.empresaEndereco} e seu empregado(a) ${data.candidatoNome}${enderecoEmpregado}, portador(a) do CPF nº ${data.candidatoCpf}. Fica acordado que aos domingos e feriados haverá jornada de trabalho de acordo com a escala.`,
      'As partes convencionam, para todos os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, que o presente instrumento é celebrado e assinado por meio eletrônico, reconhecendo-o desde já como válido, autêntico, íntegro e eficaz, com força de instrumento particular, ainda que a assinatura do EMPREGADO seja produzida por processo de certificação não vinculado à ICP-Brasil.',
      'A assinatura do EMPREGADO será colhida mediante assinatura eletrônica avançada, na acepção do art. 4º, II, da Lei nº 14.063/2020, adotada como parâmetro técnico de referência, por um ou mais dos seguintes métodos disponibilizados pela plataforma Admissão Digital: (i) código de uso único (OTP) enviado ao endereço de e-mail e/ou ao número de telefone celular previamente cadastrados pelo EMPREGADO; (ii) verificação biométrica; e/ou (iii) reconhecimento facial com prova de vivacidade.',
      'A EMPREGADORA firmará o instrumento por seu representante legal ou procurador com poderes bastantes, mediante certificado digital padrão ICP-Brasil, na forma do art. 10, § 1º, da MP nº 2.200-2/2001.',
      'O EMPREGADO declara que teve acesso prévio e integral ao teor deste instrumento antes de assiná-lo, que dispôs de tempo suficiente para sua leitura, que lhe foi facultado esclarecer dúvidas junto à EMPREGADORA e que o endereço de e-mail e o número de telefone utilizados para o recebimento do código de uso único são de sua exclusiva titularidade e uso pessoal.',
      'Integram este instrumento, para todos os efeitos probatórios, o comprovante de assinatura eletrônica e a respectiva trilha de auditoria, dos quais constarão a identificação do signatário, o método de autenticação empregado, data e hora, endereço IP, dispositivo utilizado, código de verificação e os resumos criptográficos (hash) do documento antes e após a assinatura.',
      'A EMPREGADORA disponibilizará ao EMPREGADO, sem qualquer custo, acesso permanente ao documento assinado e ao respectivo comprovante, com possibilidade de download, e encaminhará cópia ao e-mail por ele indicado, obrigando-se a arquivar o instrumento e sua trilha de auditoria por prazo não inferior a 5 (cinco) anos contados da extinção do contrato de trabalho.',
    ].join('\n');

    const { page: lastPage, y: lastY } = drawParagraphs(pdf, page, conteudo, regular, y, 10, {
      lineHeight: 14,
      paragraphSpacing: 14,
      blankLineHeight: 0,
      x: 42,
      maxWidth: 511,
    });

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(data.dataAdmissao);
    const localData = `${data.empresaCidade}, ${dataFormatada}.`;
    lastPage.drawText(localData, { x: 42, y: lastY - 10, size: 10, font: regular });

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
}
