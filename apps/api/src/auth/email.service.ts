import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type SignedDocumentAttachment = {
  filename: string;
  content: Buffer;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtp(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Seu código de acesso — Admissão Digital',
      text: `Seu código de acesso é: ${code}\n\nEle expira em 10 minutos.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Admissão Digital</h2>
          <p>Seu código de acesso é:</p>
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${code}</p>
          <p style="color: #6b7280; font-size: 14px;">Este código expira em 10 minutos.</p>
        </div>
      `,
    });
    this.logger.log(`OTP enviado para ${email}`);
  }

  async sendSignedDocuments(
    email: string,
    candidatoNome: string,
    empresaNome: string,
    attachments: SignedDocumentAttachment[],
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Documentos assinados — Admissão Digital',
      text: [
        `Olá, ${candidatoNome}.`,
        '',
        `Segue em anexo a cópia dos documentos assinados digitalmente pela ${empresaNome}.`,
        '',
        'Guarde estes arquivos para consulta futura.',
      ].join('\n'),
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
          <h2>Documentos assinados</h2>
          <p>Olá, ${candidatoNome}.</p>
          <p>Segue em anexo a cópia dos documentos assinados digitalmente pela <strong>${empresaNome}</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">Guarde estes arquivos para consulta futura.</p>
        </div>
      `,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: 'application/pdf',
      })),
    });
    this.logger.log(`Documentos assinados enviados para ${email}`);
  }

  async sendGuardianSigningNotification(
    email: string,
    responsavelNome: string,
    candidatoNome: string,
    accessToken: string,
  ): Promise<void> {
    const baseUrl = process.env.WEB_URL ?? 'https://admissao.coelhodiniz.com.br';
    const link = `${baseUrl}/responsavel/assinaturas/${accessToken}`;

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Assinatura de responsável legal — Admissão Digital',
      text: [
        `Olá, ${responsavelNome}.`,
        '',
        `Os documentos de admissão de ${candidatoNome} estão aguardando sua assinatura como responsável legal.`,
        '',
        `Acesse o link abaixo para visualizar e assinar os documentos:`,
        link,
      ].join('\n'),
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
          <h2>Admissão Digital</h2>
          <p>Olá, ${responsavelNome}.</p>
          <p>Os documentos de admissão de <strong>${candidatoNome}</strong> estão aguardando sua assinatura como responsável legal.</p>
          <p>Acesse o link abaixo para visualizar e assinar os documentos:</p>
          <p><a href="${link}" style="display: inline-block; background: #1d4ed8; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Assinar documentos</a></p>
          <p style="color: #6b7280; font-size: 14px;">Este link é pessoal e intransferível.</p>
        </div>
      `,
    });
    this.logger.log(`Notificação de assinatura de responsável enviada para ${email}`);
  }

  async sendSignaturesCompleteNotification(
    email: string,
    destinatarioNome: string,
    baseUrl: string,
    candidatoNome?: string,
  ): Promise<void> {
    const isResponsavel = Boolean(candidatoNome);
    const subject = 'Assinaturas concluídas — Admissão Digital';
    const descricao = isResponsavel
      ? `Todos os documentos de admissão de <strong>${candidatoNome}</strong> foram assinados por você e pelo candidato.`
      : 'Todos os seus documentos de admissão foram assinados.';

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject,
      text: [
        `Olá, ${destinatarioNome}.`,
        '',
        isResponsavel
          ? `Todos os documentos de admissão de ${candidatoNome} foram assinados por você e pelo candidato.`
          : 'Todos os seus documentos de admissão foram assinados.',
        '',
        'A empresa concluirá a certificação digital em breve. Você receberá uma cópia dos documentos certificados por e-mail.',
      ].join('\n'),
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
          <h2>Admissão Digital</h2>
          <p>Olá, ${destinatarioNome}.</p>
          <p>${descricao}</p>
          <p>A empresa concluirá a certificação digital em breve. Você receberá uma cópia dos documentos certificados por e-mail.</p>
          <p style="color: #6b7280; font-size: 14px;">Este é um e-mail automático. Em caso de dúvida, entre em contato com o departamento pessoal.</p>
        </div>
      `,
    });
    this.logger.log(`Notificação de assinaturas concluídas enviada para ${email}`);
  }
}
