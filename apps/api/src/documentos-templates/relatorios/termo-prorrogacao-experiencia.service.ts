import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const empresaCidade = candidatura.requisicao.filialNome ?? 'Governador Valadares';
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const dataAdmissao =
      candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();

    const pdf = await PDFDocument.create();
    pdf.setTitle(TermoProrrogacaoExperienciaService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdf);

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharTermo(pdf, page, regular, bold, logo, {
      empresaNome,
      empresaCidade,
      candidatoNome,
      prazoContratoDias,
      prorrogacaoDias,
      dataAdmissao,
    });

    return Buffer.from(await pdf.save());
  }

  private desenharTermo(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    logo: PDFImage,
    data: {
      empresaNome: string;
      empresaCidade: string;
      candidatoNome: string;
      prazoContratoDias: number;
      prorrogacaoDias: number;
      dataAdmissao: Date;
    },
  ): void {
    let y = drawHeader(page, logo, TermoProrrogacaoExperienciaService.NOME, bold);

    const total = data.prazoContratoDias + data.prorrogacaoDias;

    const conteudo = [
      `Por mútuo acordo entre as partes, fica o presente Contrato de Experiência (${data.prazoContratoDias} dias) prorrogado por mais ${data.prorrogacaoDias} dias, totalizando ${total} dias, nos termos do Art. 445, parágrafo único, da CLT.`,
      `A prorrogação terá vigência a partir do vencimento do prazo inicial do contrato, encerrando-se automaticamente ao término do prazo acima estabelecido.`,
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
    );
    drawFooter(page);
  }
}
