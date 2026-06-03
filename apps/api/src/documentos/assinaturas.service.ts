import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  MetodoAssinatura,
  Role,
  SetorAssinatura,
  StatusDocumentoAdmissao,
  StatusDocumentoAssinatura,
  StatusEnvelopeAssinatura,
  StatusRequisicaoVaga,
  TipoEventoAssinatura,
} from '@prisma/client';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { EmailService } from '../auth/email.service';
import { OtpService } from '../auth/otp.service';
import { SmsService } from '../auth/sms.service';
import { EmpresaCertificadosService } from '../empresas/empresa-certificados.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentosService } from './documentos.service';
import { PdfDigitalSignatureService } from './pdf-digital-signature.service';

type RequestEvidence = { ip?: string; userAgent?: string };
type CandidaturaAssinatura = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

const assinaturaTemplates = {
  [SetorAssinatura.ADM_PESSOAL]: [
    ['contrato-trabalho', 'Contrato de trabalho'],
    ['termo-prorrogacao', 'Termo de prorrogação'],
    ['declaracao-deslocamento', 'Declaração de deslocamento'],
    ['solicitacao-vt', 'Solicitação VT'],
    ['ficha-funcionario', 'Ficha do funcionário'],
    ['declaracao-treinamento-biometrico', 'Declaração de treinamento - registro eletrônico biométrico'],
    ['acordo-domingos-feriados', 'Acordo para trabalho aos domingos e feriados'],
  ],
  [SetorAssinatura.SESMT]: [
    ['certificados-seguranca', 'Certificados NR12, segurança básica, EPI e treinamentos aplicáveis'],
    ['ordem-servico-pgr', 'Ordem de serviço PGR'],
    ['nr-12', 'NR-12'],
  ],
} satisfies Record<SetorAssinatura, [string, string][]>;

@Injectable()
export class AssinaturasService {
  private readonly logger = new Logger(AssinaturasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly documentos: DocumentosService,
    private readonly certificados: EmpresaCertificadosService,
    private readonly pdfDigitalSignature: PdfDigitalSignatureService,
  ) {}

  async listMyEnvelopes(userId: number) {
    return this.prisma.candidatura.findMany({
      where: { candidato: { userId }, envelopesAssinatura: { some: {} } },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForRh(userId: number) {
    await this.ensureRh(userId);

    return this.prisma.candidatura.findMany({
      where: { envelopesAssinatura: { some: {} } },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async gerarParaRh(userId: number, candidaturaId: number) {
    await this.ensureRh(userId);
    await this.documentos.ensureDocumentos(candidaturaId);

    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, documentos: true },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    if (!candidatura.candidato.userId) {
      throw new BadRequestException('Candidato ainda não possui usuário vinculado para assinar.');
    }
    if (!this.canStartSignature(candidatura.documentos)) {
      throw new BadRequestException('Aprove ou dispense todos os documentos obrigatórios antes de gerar assinaturas.');
    }

    await this.ensureEnvelopes(candidatura.id, candidatura.candidato.userId);

    return this.prisma.candidatura.findUnique({
      where: { id: candidatura.id },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async sendOtp(userId: number, envelopeId: number, evidence: RequestEvidence) {
    const envelope = await this.findEnvelopeForUser(userId, envelopeId);
    if (envelope.status === StatusEnvelopeAssinatura.CONCLUIDO) {
      throw new BadRequestException('Envelope já concluído.');
    }

    const identifier = this.signatureIdentifier(envelope.candidatura.candidato);
    const code = this.otp.generate();
    await this.otp.save(identifier, code);
    await this.deliverOtp(identifier, code);

    await this.prisma.envelopeAssinatura.update({
      where: { id: envelope.id },
      data: {
        status: StatusEnvelopeAssinatura.AGUARDANDO_OTP,
        otpIdentifier: identifier,
        sessionToken: null,
        sessionExpiraEm: null,
      },
    });
    await this.recordEvent(envelope.id, TipoEventoAssinatura.OTP_ENVIADO, evidence, {
      identifierMasked: this.maskIdentifier(identifier),
    });

    return { message: 'Código enviado.', identifier: this.maskIdentifier(identifier) };
  }

  async verifyOtp(userId: number, envelopeId: number, code: string, evidence: RequestEvidence) {
    const envelope = await this.findEnvelopeForUser(userId, envelopeId);
    if (!envelope.otpIdentifier) throw new BadRequestException('Solicite o código antes de validar.');

    const valid = await this.otp.verify(envelope.otpIdentifier, code);
    if (!valid) throw new ForbiddenException('Código inválido ou expirado.');

    const sessionToken = randomUUID();
    const sessionExpiraEm = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.envelopeAssinatura.update({
      where: { id: envelope.id },
      data: { status: StatusEnvelopeAssinatura.OTP_VALIDADO, otpValidadoEm: new Date(), sessionToken, sessionExpiraEm },
    });
    await this.recordEvent(envelope.id, TipoEventoAssinatura.OTP_VALIDADO, evidence);

    return { sessionToken, sessionExpiraEm };
  }

  async viewDocument(userId: number, documentoId: number, evidence: RequestEvidence) {
    const documento = await this.findDocumentForUser(userId, documentoId);
    if (documento.empresaPdfFinal) return Buffer.from(documento.empresaPdfFinal);

    if (!documento.visualizadoEm) {
      await this.prisma.documentoAssinatura.update({
        where: { id: documento.id },
        data: { visualizadoEm: new Date() },
      });
      await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_VISUALIZADO, evidence, {
        documentoId: documento.id,
      });
    }

    return this.renderDocumentoPdf(documento);
  }

  async viewDocumentForRh(userId: number, documentoId: number) {
    await this.ensureRh(userId);
    const documento = await this.prisma.documentoAssinatura.findUnique({ where: { id: documentoId } });
    if (!documento) throw new NotFoundException('Documento de assinatura não encontrado.');
    if (documento.empresaPdfFinal) return Buffer.from(documento.empresaPdfFinal);

    return this.renderDocumentoPdf(documento);
  }

  async signDocument(userId: number, documentoId: number, sessionToken: string, evidence: RequestEvidence) {
    const documento = await this.findDocumentForUser(userId, documentoId);
    if (documento.status === StatusDocumentoAssinatura.ASSINADO) return documento;
    if (!documento.visualizadoEm) throw new BadRequestException('Visualize o documento antes de assinar.');

    this.validateSession(documento.envelope, sessionToken);

    const candidato = documento.envelope.candidatura.candidato;
    const signedAt = new Date();
    const codigoVerificacao = this.generateVerificationCode();
    const pdfCandidato = await this.renderDocumentoPdf({
        ...documento,
        status: StatusDocumentoAssinatura.ASSINADO,
        assinadoEm: signedAt,
        assinaturaNome: candidato.nome ?? documento.envelope.user.nome,
        assinaturaCpf: candidato.cpf,
        assinaturaIp: evidence.ip ?? null,
        assinaturaUserAgent: evidence.userAgent ?? null,
        codigoVerificacao,
        hashAssinado: null,
      });
    const hashAssinado = this.hashBuffer(pdfCandidato);

    const signed = await this.prisma.documentoAssinatura.update({
      where: { id: documento.id },
      data: {
        status: StatusDocumentoAssinatura.ASSINADO,
        assinadoEm: signedAt,
        assinaturaNome: candidato.nome ?? documento.envelope.user.nome,
        assinaturaCpf: candidato.cpf,
        assinaturaIp: evidence.ip,
        assinaturaUserAgent: evidence.userAgent,
        metodoAssinatura: MetodoAssinatura.OTP,
        codigoVerificacao,
        hashAssinado,
      },
    });

    await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_ASSINADO, evidence, {
      documentoId: documento.id,
      hashOriginal: documento.hashOriginal,
      hashAssinado,
      codigoVerificacao,
    });
    await this.concludeEnvelopeIfComplete(documento.envelopeId);

    return signed;
  }

  async signEnvelopeByBiometria(envelopeId: number, biometriaSolicitacaoId: number, evidence: RequestEvidence) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: {
        candidatura: { include: { candidato: true, requisicao: { include: { empresa: true } } } },
        user: true,
        documentos: { orderBy: { ordem: 'asc' } },
      },
    });
    if (!envelope) throw new NotFoundException('Envelope não encontrado.');

    const solicitacao = await this.prisma.biometriaSolicitacao.findUnique({
      where: { id: biometriaSolicitacaoId },
      include: { dispositivo: true, solicitadaPor: true },
    });
    if (!solicitacao || solicitacao.envelopeId !== envelope.id) {
      throw new BadRequestException('Solicitação biométrica inválida para o envelope.');
    }

    const candidato = envelope.candidatura.candidato;
    const signedAt = solicitacao.concluidaEm ?? new Date();
    const pendingDocuments = envelope.documentos.filter(
      (documento) => documento.status !== StatusDocumentoAssinatura.ASSINADO,
    );

    for (const documento of pendingDocuments) {
      const codigoVerificacao = this.generateVerificationCode();
      const assinaturaUserAgent = solicitacao.dispositivo
        ? `Biometria: ${solicitacao.dispositivo.nome}`
        : evidence.userAgent;
      const pdfCandidato = await this.renderDocumentoPdf({
        ...documento,
        status: StatusDocumentoAssinatura.ASSINADO,
        assinadoEm: signedAt,
        assinaturaNome: candidato.nome ?? envelope.user.nome,
        assinaturaCpf: candidato.cpf,
        assinaturaIp: evidence.ip ?? null,
        assinaturaUserAgent: assinaturaUserAgent ?? null,
        metodoAssinatura: MetodoAssinatura.BIOMETRIA,
        codigoVerificacao,
        hashAssinado: null,
      });
      const hashAssinado = this.hashBuffer(pdfCandidato);

      await this.prisma.documentoAssinatura.update({
        where: { id: documento.id },
        data: {
          status: StatusDocumentoAssinatura.ASSINADO,
          assinadoEm: signedAt,
          assinaturaNome: candidato.nome ?? envelope.user.nome,
          assinaturaCpf: candidato.cpf,
          assinaturaIp: evidence.ip,
          assinaturaUserAgent,
          metodoAssinatura: MetodoAssinatura.BIOMETRIA,
          biometriaSolicitacaoId,
          codigoVerificacao,
          hashAssinado,
        },
      });
      await this.recordEvent(envelope.id, TipoEventoAssinatura.DOCUMENTO_ASSINADO_BIOMETRIA, evidence, {
        documentoId: documento.id,
        biometriaSolicitacaoId,
        dispositivoId: solicitacao.dispositivoId,
        dispositivoNome: solicitacao.dispositivo?.nome,
        solicitadoPorId: solicitacao.solicitadaPorId,
        solicitadoPorNome: solicitacao.solicitadaPor.nome,
        hashOriginal: documento.hashOriginal,
        hashAssinado,
        codigoVerificacao,
      });
    }

    await this.certifyEnvelopeDocuments(envelope.id);
    await this.concludeEnvelopeIfComplete(envelope.id);
  }

  private async ensureEnvelopes(candidaturaId: number, userId: number) {
    for (const setor of Object.values(SetorAssinatura)) {
      const envelope = await this.prisma.envelopeAssinatura.upsert({
        where: { candidaturaId_setor: { candidaturaId, setor } },
        create: { candidaturaId, userId, setor },
        update: {},
      });
      await this.ensureDocuments(envelope.id, candidaturaId, setor);
      await this.recordEvent(envelope.id, TipoEventoAssinatura.ENVELOPE_CRIADO, {});
    }

    await this.prisma.requisicaoVaga.updateMany({
      where: { candidaturas: { some: { id: candidaturaId } } },
      data: { status: StatusRequisicaoVaga.AGUARDANDO_ASSINATURA },
    });
  }

  private async ensureDocuments(envelopeId: number, candidaturaId: number, setor: SetorAssinatura) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, requisicao: { include: { empresa: true } } },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');

    const templates = assinaturaTemplates[setor];
    await Promise.all(
      templates.map(([codigo, nome], index) => {
        const conteudo = this.buildContent(setor, nome, candidatura);
        return this.prisma.documentoAssinatura.upsert({
          where: { envelopeId_codigo: { envelopeId, codigo } },
          create: {
            envelopeId,
            codigo,
            nome,
            descricao: `Documento de assinatura eletrônica avançada do setor ${setor}.`,
            ordem: index + 1,
            conteudo,
            hashOriginal: this.hash(conteudo),
          },
          update: {},
        });
      }),
    );
  }

  private canStartSignature(documentos: { obrigatorio: boolean; status: StatusDocumentoAdmissao; dispensadoPorId: number | null; templateId: number | null }[]) {
    const documentosAtuais = documentos.some((documento) => documento.templateId !== null)
      ? documentos.filter((documento) => documento.templateId !== null)
      : documentos;
    const obrigatorios = documentosAtuais.filter((documento) => documento.obrigatorio);
    if (obrigatorios.length === 0) return false;

    return obrigatorios.every((documento) => {
      if (documento.dispensadoPorId) return true;
      return documento.status === StatusDocumentoAdmissao.APROVADO;
    });
  }

  private buildContent(
    setor: SetorAssinatura,
    nome: string,
    candidatura: CandidaturaAssinatura,
  ) {
    if (nome === 'Contrato de trabalho') return this.buildContratoTrabalho(candidatura);
    if (nome === 'Termo de prorrogação') return this.buildTermoProrrogacao(candidatura);

    return [
      nome,
      `Setor: ${setor}`,
      `Candidato: ${candidatura.candidato.nome ?? 'Nome não informado'}`,
      `CPF: ${candidatura.candidato.cpf}`,
      `Empresa: ${candidatura.requisicao.empresa?.nome ?? 'Empresa não informada'}`,
      `Cargo: ${candidatura.requisicao.cargoNome ?? candidatura.requisicao.cargo ?? 'Cargo não informado'}`,
      `Requisição: ${candidatura.requisicao.id}`,
      '',
      'Declaro que li integralmente este documento, compreendi seu conteúdo e manifesto minha assinatura eletrônica avançada para todos os fins aplicáveis.',
    ].join('\n');
  }

  private buildContratoTrabalho(candidatura: CandidaturaAssinatura) {
    const empresa = candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const cnpj = '41.930.199/0026-92';
    const endereco = 'MARECHAL FLORIANO, 1527 - CENTRO';
    const cidade = 'Governador Valadares';
    const empregado = candidatura.candidato.nome ?? 'Nome não informado';
    const cargo = candidatura.requisicao.cargoNome ?? candidatura.requisicao.cargo ?? 'Cargo não informado';
    const data = this.formatDate(candidatura.requisicao.dataPrevistaAdmissao ?? new Date());

    return [
      'Contrato de Trabalho a Título de Experiência',
      '',
      `Entre a firma ${empresa}, CNPJ ${cnpj}, com sede em ${cidade} na ${endereco}, doravante designada simplesmente EMPREGADORA e ${empregado}, a seguir chamado apenas EMPREGADO, é celebrado o presente CONTRATO DE EXPERIÊNCIA, que terá vigência a partir da data de início de serviços, de acordo com as condições a seguir especificadas:`,
      '',
      `1 - Fica o EMPREGADO admitido no quadro de funcionários da EMPREGADORA para exercer as funções de ${cargo.toUpperCase()} mediante a remuneração registrada em sua ficha funcional. A circunstância, porém, de ser a função especificada não importa na intransferibilidade do EMPREGADO para outro serviço, o qual demonstre melhor capacidade de adaptação desde que compatível com a sua condição pessoal.`,
      '2 - O horário de trabalho será anotado na sua ficha de registro e a eventual redução de jornada, por determinação da EMPREGADORA, não inovará este ajuste, permanecendo sempre íntegra a obrigação do EMPREGADO de cumprir o horário que lhe for determinado, observando o limite legal.',
      '3 - Obriga-se também o EMPREGADO a prestar serviços em horas extraordinárias, sempre que lhe for determinado pela EMPREGADORA na forma prevista em Lei. Na hipótese desta faculdade pela EMPREGADORA, o EMPREGADO receberá as horas extraordinárias em acréscimo legal, salvo a ocorrência de compensação, com a consequente redução da jornada de trabalho em outro dia.',
      '4 - Aceita o EMPREGADO, expressamente, a condição de prestar serviços em qualquer dos turnos de trabalho, isto é, tanto durante o dia como a noite, desde que sem simultaneidade, observadas as prescrições legais reguladoras do assunto quanto à remuneração.',
      '5 - Fica ajustado nos termos do que dispõe o Parágrafo 1º do artigo 469 da Consolidação das Leis do Trabalho, que o EMPREGADO acatará ordem emanada da EMPREGADORA para prestação de serviços tanto na localidade de celebração do Contrato de Trabalho, como em qualquer outra cidade do Território Nacional, quer essa transferência seja transitória, quer seja definitiva.',
      '6 - No ato da assinatura deste contrato, o EMPREGADO recebe o Regulamento Interno da Empresa cujas cláusulas fazem parte do Contrato de Trabalho, e a violação de qualquer delas implicará em sanção, cuja graduação dependerá da gravidade da mesma, culminando com a rescisão do Contrato.',
      '7 - Em caso de dano causado pelo EMPREGADO, fica a EMPREGADORA autorizada a efetivar o desconto da importância correspondente ao prejuízo, com fundamento no Parágrafo 1º do Artigo 462 da Consolidação das Leis do Trabalho, já que essa possibilidade fica expressamente prevista em Contrato.',
      '8 - O presente Contrato vigerá durante 30 dias, sendo celebrado para as partes verificarem reciprocamente a conveniência ou não de se vincularem em caráter definitivo a um Contrato de Trabalho.',
      '9 - Opera-se a rescisão do presente Contrato pela decorrência do prazo supra ou por vontade de uma das partes; rescindindo-se antes do prazo, por qualquer uma das partes, aplicam-se as regras legais cabíveis.',
      '10 - Na hipótese deste ajuste transformar-se em Contrato de Prazo Indeterminado pelo decurso do tempo, continuarão em plena vigência as cláusulas de 1 a 7 enquanto durarem as relações do EMPREGADO com a EMPREGADORA.',
      '',
      `${cidade}, ${data}.`,
      '',
      `EMPREGADORA: ${empresa.toUpperCase()}`,
      `EMPREGADO: ${empregado.toUpperCase()}`,
    ].join('\n');
  }

  private buildTermoProrrogacao(candidatura: CandidaturaAssinatura) {
    const empresa = candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const empregado = candidatura.candidato.nome ?? 'Nome não informado';

    return [
      'Termo de Prorrogação',
      '',
      'Por mútuo acordo entre as partes, fica o presente Contrato de Experiência, que deveria vencer nesta data, prorrogado até _______/_______/_______.',
      '',
      `EMPREGADORA: ${empresa.toUpperCase()}`,
      `EMPREGADO: ${empregado.toUpperCase()}`,
    ].join('\n');
  }

  private async renderDocumentoPdf(documento: {
    nome: string;
    conteudo: string;
    hashOriginal: string;
    hashAssinado: string | null;
    status: StatusDocumentoAssinatura;
    assinadoEm: Date | null;
    assinaturaNome: string | null;
    assinaturaCpf: string | null;
    assinaturaIp: string | null;
    assinaturaUserAgent: string | null;
    metodoAssinatura?: MetodoAssinatura | null;
    codigoVerificacao: string | null;
  }) {
    const pdf = await PDFDocument.create();
    pdf.setTitle(documento.nome);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');
    const documentDate = documento.assinadoEm ?? new Date(0);
    pdf.setCreationDate(documentDate);
    pdf.setModificationDate(documentDate);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]);
    let cursorY = this.drawHeader(page, bold);

    const [title, ...body] = documento.conteudo.split('\n');
    page.drawText(title, { x: 70, y: cursorY, size: 13, font: bold, color: rgb(0, 0, 0) });
    cursorY -= 32;
    cursorY = this.drawParagraphs(pdf, page, body.join('\n'), regular, cursorY, 10);

    cursorY -= 18;
    cursorY = this.drawSignatureLines(pdf, page, regular, bold, cursorY, documento.conteudo);
    this.drawFooter(page, regular, documento.hashOriginal);

    if (documento.status === StatusDocumentoAssinatura.ASSINADO) {
      this.drawAuditPage(pdf, regular, bold, documento);
    }

    return Buffer.from(await pdf.save());
  }

  private drawHeader(page: PDFPage, bold: PDFFont) {
    const { height } = page.getSize();
    page.drawRectangle({ x: 36, y: height - 58, width: 108, height: 34, color: rgb(1, 0.92, 0.05) });
    page.drawText('CD Coelho Diniz', { x: 44, y: height - 46, size: 12, font: bold, color: rgb(0.08, 0.08, 0.08) });
    page.drawLine({ start: { x: 36, y: height - 66 }, end: { x: 559, y: height - 66 }, thickness: 2, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 36, y: height - 70 }, end: { x: 559, y: height - 70 }, thickness: 0.7, color: rgb(0, 0, 0) });

    return height - 96;
  }

  private drawParagraphs(pdf: PDFDocument, startPage: PDFPage, content: string, font: PDFFont, startY: number, size: number) {
    let page = startPage;
    let cursorY = startY;
    const paragraphs = content.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        cursorY -= 10;
        continue;
      }
      const lines = this.wrapText(paragraph, font, size, 455);
      for (const line of lines) {
        if (cursorY < 70) {
          page = pdf.addPage([595.28, 841.89]);
          cursorY = 785;
        }
        page.drawText(line, { x: 70, y: cursorY, size, font, color: rgb(0, 0, 0) });
        cursorY -= 13;
      }
      cursorY -= 6;
    }

    return cursorY;
  }

  private drawSignatureLines(pdf: PDFDocument, startPage: PDFPage, regular: PDFFont, bold: PDFFont, startY: number, conteudo: string) {
    const lines = conteudo.split('\n').filter((line) => line.startsWith('EMPREGAD'));
    let page = startPage;
    let cursorY = startY < 170 ? 740 : startY;
    if (startY < 170) page = pdf.addPage([595.28, 841.89]);

    for (const line of lines) {
      page.drawLine({ start: { x: 130, y: cursorY }, end: { x: 465, y: cursorY }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(line.replace(/^EMPREGADORA: |^EMPREGADO: /, ''), { x: 170, y: cursorY - 18, size: 10, font: bold });
      cursorY -= 58;
    }

    page.drawText('Testemunhas:', { x: 70, y: cursorY, size: 10, font: regular });
    cursorY -= 26;
    page.drawText('1.', { x: 70, y: cursorY, size: 10, font: regular });
    page.drawLine({ start: { x: 82, y: cursorY }, end: { x: 270, y: cursorY }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('2.', { x: 320, y: cursorY, size: 10, font: regular });
    page.drawLine({ start: { x: 332, y: cursorY }, end: { x: 520, y: cursorY }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });

    return cursorY - 30;
  }

  private drawFooter(page: PDFPage, font: PDFFont, hashOriginal: string) {
    page.drawLine({ start: { x: 36, y: 34 }, end: { x: 559, y: 34 }, thickness: 2, color: rgb(0, 0, 0) });
    page.drawText(`Hash original SHA-256: ${hashOriginal}`, { x: 36, y: 18, size: 6, font, color: rgb(0.35, 0.35, 0.35) });
  }

  private drawAuditPage(
    pdf: PDFDocument,
    regular: PDFFont,
    bold: PDFFont,
    documento: {
      hashOriginal: string;
      hashAssinado: string | null;
      assinadoEm: Date | null;
      assinaturaNome: string | null;
      assinaturaCpf: string | null;
      assinaturaIp: string | null;
      assinaturaUserAgent: string | null;
      metodoAssinatura?: MetodoAssinatura | null;
      codigoVerificacao: string | null;
    },
  ) {
    const page = pdf.addPage([595.28, 841.89]);
    let cursorY = this.drawHeader(page, bold);
    page.drawText('Comprovante de assinatura eletrônica avançada', { x: 70, y: cursorY, size: 14, font: bold });
    cursorY -= 34;

    const rows = [
      ['Método', documento.metodoAssinatura === MetodoAssinatura.BIOMETRIA ? 'Assinatura biométrica assistida' : 'Assinatura eletrônica por OTP'],
      ['Assinado por', documento.assinaturaNome ?? 'Não informado'],
      ['CPF', documento.assinaturaCpf ?? 'Não informado'],
      ['Data/hora', documento.assinadoEm?.toISOString() ?? 'Não informado'],
      ['IP', documento.assinaturaIp ?? 'Não informado'],
      ['Dispositivo', documento.assinaturaUserAgent ?? 'Não informado'],
      ['Código de verificação', documento.codigoVerificacao ?? 'Não informado'],
      ['Hash original SHA-256', documento.hashOriginal],
    ];

    for (const [label, value] of rows) {
      page.drawText(`${label}:`, { x: 70, y: cursorY, size: 10, font: bold });
      cursorY -= 14;
      for (const line of this.wrapText(value, regular, 9, 455)) {
        page.drawText(line, { x: 86, y: cursorY, size: 9, font: regular });
        cursorY -= 12;
      }
      cursorY -= 8;
    }
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
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

  private validateSession(envelope: { sessionToken: string | null; sessionExpiraEm: Date | null; status: StatusEnvelopeAssinatura }, sessionToken: string) {
    if (envelope.status !== StatusEnvelopeAssinatura.OTP_VALIDADO) {
      throw new ForbiddenException('Valide o OTP antes de assinar.');
    }
    if (!envelope.sessionToken || envelope.sessionToken !== sessionToken) {
      throw new ForbiddenException('Sessão de assinatura inválida.');
    }
    if (!envelope.sessionExpiraEm || envelope.sessionExpiraEm <= new Date()) {
      throw new ForbiddenException('Sessão de assinatura expirada.');
    }
  }

  private async concludeEnvelopeIfComplete(envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { documentos: true, candidatura: true },
    });
    if (!envelope) return;
    const complete = envelope.documentos.every((documento) => documento.status === StatusDocumentoAssinatura.ASSINADO);
    if (!complete) return;

    await this.prisma.envelopeAssinatura.update({
      where: { id: envelopeId },
      data: { status: StatusEnvelopeAssinatura.CONCLUIDO, concluidoEm: new Date() },
    });
    await this.recordEvent(envelopeId, TipoEventoAssinatura.ENVELOPE_CONCLUIDO, {});

    const pending = await this.prisma.envelopeAssinatura.count({
      where: { candidaturaId: envelope.candidaturaId, status: { not: StatusEnvelopeAssinatura.CONCLUIDO } },
    });
    if (pending === 0) {
      await this.certifyAndEmailSignedDocuments(envelope.candidaturaId);
      await this.prisma.requisicaoVaga.update({
        where: { id: envelope.candidatura.requisicaoId },
        data: { status: StatusRequisicaoVaga.AGUARDANDO_RH },
      });
    }
  }

  private async certifyEnvelopeDocuments(envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { candidatura: { include: { requisicao: true } }, documentos: { orderBy: { ordem: 'asc' } } },
    });
    if (!envelope) return;
    if (!envelope.candidatura.requisicao.empresaId) {
      throw new BadRequestException('Candidatura sem empresa para assinatura digital dos PDFs.');
    }

    const certificado = await this.certificados.getActiveCertificateForEmpresa(envelope.candidatura.requisicao.empresaId);
    for (const documento of envelope.documentos) {
      if (documento.status !== StatusDocumentoAssinatura.ASSINADO || documento.empresaPdfFinal) continue;
      await this.certifyDocument(documento, certificado);
    }
  }

  private async certifyAndEmailSignedDocuments(candidaturaId: number) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        candidato: true,
        requisicao: { include: { empresa: true } },
        envelopesAssinatura: {
          include: { documentos: { orderBy: { ordem: 'asc' } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!candidatura) return;
    if (!candidatura.requisicao.empresaId) {
      throw new BadRequestException('Candidatura sem empresa para assinatura digital dos PDFs.');
    }

    const certificado = await this.certificados.getActiveCertificateForEmpresa(candidatura.requisicao.empresaId);
    const documentos = candidatura.envelopesAssinatura.flatMap((envelope) => envelope.documentos);
    const attachments: { filename: string; content: Buffer }[] = [];

    for (const documento of documentos) {
      const pdfFinal = documento.empresaPdfFinal
        ? Buffer.from(documento.empresaPdfFinal)
        : await this.certifyDocument(documento, certificado);
      attachments.push({ filename: `${this.safeFilename(documento.nome)}.pdf`, content: pdfFinal });
    }

    if (!candidatura.candidato.email) {
      this.logger.warn(`Candidato ${candidatura.candidato.id} sem e-mail para receber documentos assinados.`);
      return;
    }

    await this.email.sendSignedDocuments(
      candidatura.candidato.email,
      candidatura.candidato.nome ?? 'candidato',
      candidatura.requisicao.empresa?.nome ?? 'empresa',
      attachments,
    );
  }

  private async certifyDocument(
    documento: Prisma.DocumentoAssinaturaGetPayload<Record<string, never>>,
    certificado: Awaited<ReturnType<EmpresaCertificadosService['getActiveCertificateForEmpresa']>>,
  ) {
    const pdfCandidato = await this.renderDocumentoPdf(documento);
    const pdfFinalEmpresa = await this.pdfDigitalSignature.signWithPfx(
      pdfCandidato,
      certificado.pfx,
      certificado.password,
    );
    const empresaPdfHash = this.hashBuffer(pdfFinalEmpresa);

    await this.prisma.documentoAssinatura.update({
      where: { id: documento.id },
      data: {
        empresaCertificadoId: certificado.id,
        empresaAssinouEm: new Date(),
        empresaCertSubject: certificado.subject,
        empresaCertIssuer: certificado.issuer,
        empresaCertSerial: certificado.serialNumber,
        empresaPdfHash,
        empresaPdfFinal: pdfFinalEmpresa,
      },
    });
    await this.recordEvent(documento.envelopeId, TipoEventoAssinatura.DOCUMENTO_CERTIFICADO_EMPRESA, {}, {
      documentoId: documento.id,
      empresaCertificadoId: certificado.id,
      empresaPdfHash,
      certificadoSubject: certificado.subject,
      certificadoIssuer: certificado.issuer,
      certificadoSerial: certificado.serialNumber,
    });

    return pdfFinalEmpresa;
  }

  private async findEnvelopeForUser(userId: number, envelopeId: number) {
    const envelope = await this.prisma.envelopeAssinatura.findUnique({
      where: { id: envelopeId },
      include: { candidatura: { include: { candidato: true } }, user: true },
    });
    if (!envelope || envelope.userId !== userId) throw new NotFoundException('Envelope não encontrado.');

    return envelope;
  }

  private async findDocumentForUser(userId: number, documentoId: number) {
    const documento = await this.prisma.documentoAssinatura.findUnique({
      where: { id: documentoId },
      include: {
        envelope: {
          include: {
            candidatura: { include: { candidato: true, requisicao: true } },
            user: true,
          },
        },
      },
    });
    if (!documento || documento.envelope.userId !== userId) {
      throw new NotFoundException('Documento de assinatura não encontrado.');
    }

    return documento;
  }

  private async ensureRh(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== Role.RH && user.role !== Role.ADMIN)) {
      throw new ForbiddenException('Acesso restrito ao RH.');
    }
  }

  private signatureIdentifier(candidato: { email: string | null; telefone: string | null }) {
    const identifier = candidato.email ?? candidato.telefone;
    if (!identifier) throw new BadRequestException('Candidato sem e-mail ou telefone para envio do OTP.');

    return identifier;
  }

  private async deliverOtp(identifier: string, code: string) {
    if (identifier.includes('@')) {
      await this.email.sendOtp(identifier, code);
      return;
    }

    await this.sms.sendOtp(identifier, code);
  }

  private recordEvent(envelopeId: number, tipo: TipoEventoAssinatura, evidence: RequestEvidence, metadata?: Prisma.InputJsonValue) {
    return this.prisma.eventoAssinatura.create({
      data: {
        envelopeId,
        tipo,
        ip: evidence.ip,
        userAgent: evidence.userAgent,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });
  }

  private hash(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private hashBuffer(value: Buffer) {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeFilename(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  private generateVerificationCode() {
    return `AD-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private maskIdentifier(identifier: string) {
    if (identifier.includes('@')) {
      const [name, domain] = identifier.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }

    return `${identifier.slice(0, 3)}***${identifier.slice(-2)}`;
  }
}
