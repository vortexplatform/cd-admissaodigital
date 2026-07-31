import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts } from 'pdf-lib';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawAssinaturasEletronicas,
  drawHeader,
  drawParagraphs,
  embedLogo,
  wrapText,
} from '../pdf-render.utils';

type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

const EMPRESA_NOME = 'Supermercado Coelho Diniz Ltda';
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
  static readonly NOME = 'Declaração de Treinamento - Registro Eletrônico Biométrico/Facial';

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
    const logo = await embedLogo(pdf);
    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const empresaCidade = candidatura.requisicao.filialNome ?? 'Governador Valadares';
    const dataAdmissao =
      candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharDeclaracao(pdf, page, regular, bold, logo, candidatoNome, empresaCidade, dataAdmissao);

    return Buffer.from(await pdf.save());
  }

  private desenharDeclaracao(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    logo: PDFImage,
    candidatoNome: string,
    empresaCidade: string,
    dataAdmissao: Date,
  ): void {
    let y = drawHeader(page, logo, DeclaracaoTreinamentoService.NOME, bold);

    // Empregado(a)
    page.drawText('Empregado(a): ', { x: 70, y, size: 10, font: bold });
    const labelWidth = bold.widthOfTextAtSize('Empregado(a): ', 10);
    page.drawText(candidatoNome, { x: 70 + labelWidth, y, size: 10, font: regular });
    y -= 22;

    // Texto introdutório
    const intro = 'Declaro haver lido e compreendido o conteúdo abaixo relativo ao assunto e ter recebido treinamento para utilização do \'Registro Eletrônico Biométrico/Facial da Jornada de Trabalho\'. Estou ciente, portanto, de que utilizar o Registro Eletrônico corretamente faz parte das minhas obrigações como funcionário tendo como premissas principais:';
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
    const clausulasAssinatura = [
      'As partes convencionam, para todos os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, que o presente instrumento é celebrado e assinado por meio eletrônico, reconhecendo-o desde já como válido, autêntico, íntegro e eficaz, com força de instrumento particular, ainda que a assinatura do EMPREGADO seja produzida por processo de certificação não vinculado à ICP-Brasil.',
      'A assinatura do EMPREGADO será colhida mediante assinatura eletrônica avançada, na acepção do art. 4º, II, da Lei nº 14.063/2020, adotada como parâmetro técnico de referência, por um ou mais dos seguintes métodos disponibilizados pela plataforma Admissão Digital: (i) código de uso único (OTP) enviado ao endereço de e-mail e/ou ao número de telefone celular previamente cadastrados pelo EMPREGADO; (ii) verificação biométrica; e/ou (iii) reconhecimento facial com prova de vivacidade.',
      'A EMPREGADORA firmará o instrumento por seu representante legal ou procurador com poderes bastantes, mediante certificado digital padrão ICP-Brasil, na forma do art. 10, § 1º, da MP nº 2.200-2/2001.',
      'O EMPREGADO declara que teve acesso prévio e integral ao teor deste instrumento antes de assiná-lo, que dispôs de tempo suficiente para sua leitura, que lhe foi facultado esclarecer dúvidas junto à EMPREGADORA e que o endereço de e-mail e o número de telefone utilizados para o recebimento do código de uso único são de sua exclusiva titularidade e uso pessoal.',
      'Integram este instrumento, para todos os efeitos probatórios, o comprovante de assinatura eletrônica e a respectiva trilha de auditoria, dos quais constarão a identificação do signatário, o método de autenticação empregado, data e hora, endereço IP, dispositivo utilizado, código de verificação e os resumos criptográficos (hash) do documento antes e após a assinatura.',
      'A EMPREGADORA disponibilizará ao EMPREGADO, sem qualquer custo, acesso permanente ao documento assinado e ao respectivo comprovante, com possibilidade de download, e encaminhará cópia ao e-mail por ele indicado, obrigando-se a arquivar o instrumento e sua trilha de auditoria por prazo não inferior a 5 (cinco) anos contados da extinção do contrato de trabalho.',
    ].join('\n');
    const { page: assinaturaPage, y: yAposAssinatura } = drawParagraphs(
      pdf,
      page,
      clausulasAssinatura,
      regular,
      y,
      10,
    );
    page = assinaturaPage;
    y = yAposAssinatura;

    page.drawText('Por ser verdade, firmo a presente.', { x: 70, y, size: 10, font: regular });
    y -= 20;

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(dataAdmissao);
    page.drawText(`${empresaCidade}, ${dataFormatada}.`, {
      x: 70, y, size: 10, font: regular,
    });
    y -= 20;

    drawAssinaturasEletronicas(pdf, page, regular, bold, y, EMPRESA_NOME, candidatoNome);
  }
}
