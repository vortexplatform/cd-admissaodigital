import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

type SignedDocumentAttachment = {
  filename: string;
  content: Buffer;
};

type EmailAttachment = SignedDocumentAttachment;

type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
};

type EmailContent = {
  title: string;
  body: string;
  action?: { label: string; url: string };
  note?: string;
};

type EmailField = {
  label: string;
  value: string | null | undefined;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter?: nodemailer.Transporter;
  private readonly resend?: Resend;
  private readonly from: string;
  private readonly replyTo?: string;

  constructor(private readonly config: ConfigService) {
    const isProduction = config.get<string>('NODE_ENV') === 'production';
    this.from = isProduction
      ? config.getOrThrow<string>('EMAIL_RESEND_FROM')
      : config.getOrThrow<string>('SMTP_FROM');
    this.replyTo = config.get<string>('EMAIL_RESEND_REPLY_TO');

    if (isProduction) {
      this.resend = new Resend(config.getOrThrow<string>('EMAIL_RESEND_API_KEY'));
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: config.getOrThrow<number>('SMTP_PORT'),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtp(email: string, code: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Código de acesso à Admissão Digital: ${code} | Supermercado Coelho Diniz`,
      text: [
        'Admissão Digital - Supermercado Coelho Diniz',
        '',
        'Seu código de acesso',
        '',
        `Use o código ${code} para acessar sua conta.`,
        '',
        'Este código expira em 10 minutos e deve ser usado uma única vez.',
        '',
        'Se você não solicitou este código, ignore este e-mail.',
      ].join('\n'),
      html: this.renderEmail(
        {
          title: 'Seu código de acesso',
          body: 'Use o código abaixo para acessar sua conta.',
          note: 'Este código expira em 10 minutos e deve ser usado uma única vez.',
        },
        `<span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; line-height: 44px; letter-spacing: 10px; color: #111111;">${this.escapeHtml(code)}</span>`,
      ),
    });
    this.logger.log(`OTP enviado para ${email}`);
  }

  async sendSignedDocuments(
    email: string,
    destinatarioNome: string,
    empresaNome: string,
    attachments: SignedDocumentAttachment[],
    portalLink?: string,
    candidatoNome?: string,
  ): Promise<void> {
    const isResponsavel = Boolean(candidatoNome);
    const descricao = isResponsavel
      ? `Segue em anexo a cópia dos documentos de admissão de ${candidatoNome}, assinados digitalmente pela ${empresaNome}.`
      : `Segue em anexo a cópia dos documentos assinados digitalmente pela ${empresaNome}.`;
    const portalText = portalLink
      ? `\nVocê também pode acessar os documentos a qualquer momento em:\n${portalLink}`
      : '';
    await this.sendEmail({
      to: email,
      subject: 'Documentos assinados - Supermercado Coelho Diniz',
      text: [
        `Olá, ${destinatarioNome}.`,
        '',
        descricao,
        '',
        'Guarde estes arquivos para consulta futura.',
        portalText,
      ].join('\n'),
      html: this.renderEmail({
        title: 'Documentos assinados',
        body: `Olá, ${destinatarioNome}.\n\n${descricao}`,
        action: portalLink ? { label: 'Acessar documentos', url: portalLink } : undefined,
        note: 'Guarde estes arquivos para consulta futura.',
      }),
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: 'application/pdf',
      })),
    });
    this.logger.log(`Documentos assinados enviados para ${email}`);
  }

  async sendDocumentsReadyNotification(
    email: string,
    candidatoNome: string,
    empresaNome: string,
    signingLink: string,
  ): Promise<void> {
    const browserLink = this.createBrowserOpenLink(signingLink);
    await this.sendEmail({
      to: email,
      subject: 'Documentos prontos para assinatura - Supermercado Coelho Diniz',
      text: [
        `Olá, ${candidatoNome}.`,
        '',
        `Seus documentos de admissão na ${empresaNome} foram gerados e estão prontos para assinatura.`,
        '',
        'Acesse o link abaixo para visualizar e assinar seus documentos:',
        browserLink,
      ].join('\n'),
      html: this.renderEmail({
        title: 'Documentos prontos para assinatura',
        body: `Olá, ${candidatoNome}.\n\nSeus documentos de admissão na ${empresaNome} foram gerados e estão prontos para assinatura.`,
        action: { label: 'Assinar documentos', url: browserLink },
        note: 'Este link é pessoal e intransferível.',
      }),
    });
    this.logger.log(`Notificação de documentos prontos enviada para ${email}`);
  }

  async sendGuardianSigningNotification(
    email: string,
    responsavelNome: string,
    candidatoNome: string,
    accessToken: string,
  ): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5010';
    const link = `${baseUrl}/responsavel/assinaturas/${accessToken}`;
    const browserLink = this.createBrowserOpenLink(link);

    await this.sendEmail({
      to: email,
      subject: 'Assinatura de responsável legal - Supermercado Coelho Diniz',
      text: [
        `Olá, ${responsavelNome}.`,
        '',
        `Os documentos de admissão de ${candidatoNome} estão aguardando sua assinatura como responsável legal.`,
        '',
        `Acesse o link abaixo para visualizar e assinar os documentos:`,
        browserLink,
      ].join('\n'),
      html: this.renderEmail({
        title: 'Assinatura de responsável legal',
        body: `Olá, ${responsavelNome}.\n\nOs documentos de admissão de ${candidatoNome} estão aguardando sua assinatura como responsável legal.`,
        action: { label: 'Assinar documentos', url: browserLink },
        note: 'Este link é pessoal e intransferível.',
      }),
    });
    this.logger.log(`Notificação de assinatura de responsável enviada para ${email}`);
  }

  async sendCandidaturaNotification(
    candidatoNome: string,
    sections: { title: string; fields: EmailField[] }[],
  ): Promise<void> {
    const details = sections
      .map(({ title, fields }) => {
        const rows = fields
          .filter(({ value }) => value !== null && value !== undefined && value !== '')
          .map(
            ({ label, value }) =>
              `<tr><td style="padding: 8px 12px; border: 1px solid #dedbd0; font-size: 13px; font-weight: 600; color: #111111; vertical-align: top;">${this.escapeHtml(label)}</td><td style="padding: 8px 12px; border: 1px solid #dedbd0; font-size: 13px; color: #626260; vertical-align: top;">${this.escapeHtml(value ?? '')}</td></tr>`,
          )
          .join('');
        return rows
          ? `<p style="margin: 20px 0 8px; font-size: 15px; font-weight: 600; color: #111111;">${this.escapeHtml(title)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">${rows}</table>`
          : '';
      })
      .join('');

    await this.sendEmail({
      to: 'vagas@coelhodiniz.com.br',
      subject: `Candidatura salva - ${candidatoNome}`,
      text: `Uma candidatura foi salva para ${candidatoNome}. Consulte a plataforma para ver os dados completos.`,
      html: this.renderEmail(
        {
          title: 'Candidatura salva',
          body: `Os dados de ${candidatoNome} foram salvos na Admissão Digital.`,
          note: 'Este e-mail contém dados pessoais e deve ser tratado de forma confidencial.',
        },
        details,
      ),
    });
    this.logger.log(
      `Notificação de candidatura enviada para vagas@coelhodiniz.com.br: ${candidatoNome}`,
    );
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    if (this.resend) {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: this.replyTo,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
        })),
      });

      if (error) throw new Error(`Falha ao enviar e-mail pelo Resend: ${error.message}`);
      return;
    }

    if (!this.transporter) throw new Error('Transporte de e-mail não configurado.');

    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: this.replyTo,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: 'application/pdf',
      })),
    });
  }

  private renderEmail(content: EmailContent, highlight?: string): string {
    const action = content.action
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;"><tr><td style="background-color: #f5c400; border-radius: 8px;"><a href="${this.escapeHtml(content.action.url)}" style="display: inline-block; padding: 12px 20px; color: #111111; font-size: 15px; font-weight: 600; line-height: 18px; text-decoration: none;">${this.escapeHtml(content.action.label)}</a></td></tr></table>`
      : '';
    const code = highlight
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;"><tr><td align="center" style="padding: 24px 16px; background-color: #fff9db; border: 1px solid #f5c400; border-radius: 8px;">${highlight}</td></tr></table>`
      : '';
    const note = content.note
      ? `<tr><td style="padding: 20px 32px 28px; border-top: 1px solid #eeece5;"><p style="margin: 0; font-size: 12px; line-height: 18px; color: #7b7b78;">${this.escapeHtml(content.note)}</p></td></tr>`
      : '';

    return `<!doctype html><html lang="pt-BR"><body style="margin: 0; padding: 0; background-color: #f8f7f2; color: #111111; font-family: Inter, Arial, sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f7f2;"><tr><td align="center" style="padding: 40px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #dedbd0; border-radius: 12px;"><tr><td style="padding: 28px 32px 24px; background-color: #111111; border-radius: 11px 11px 0 0;"><p style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; color: #ffffff;">Admissão Digital</p><p style="margin: 4px 0 0; font-size: 13px; line-height: 18px; color: #f5c400;">Supermercado Coelho Diniz</p></td></tr><tr><td style="padding: 32px;"><h1 style="margin: 0 0 16px; font-size: 28px; font-weight: 600; line-height: 34px; letter-spacing: -0.5px; color: #111111;">${this.escapeHtml(content.title)}</h1><p style="margin: 0; font-size: 16px; line-height: 24px; color: #626260; white-space: pre-line;">${this.escapeHtml(content.body)}</p>${code}${action}</td></tr>${note}</table></td></tr></table></body></html>`;
  }

  private createBrowserOpenLink(destination: string): string {
    const destinationUrl = new URL(destination);
    const candidateMatch = destinationUrl.pathname.match(/^\/candidato\/documentos\/([^/]+)$/);
    if (candidateMatch) {
      return `${destinationUrl.origin}/abrir-documentos/candidato/${encodeURIComponent(candidateMatch[1])}`;
    }

    const guardianMatch = destinationUrl.pathname.match(/^\/responsavel\/assinaturas\/([^/]+)$/);
    if (guardianMatch) {
      return `${destinationUrl.origin}/abrir-documentos/responsavel/${encodeURIComponent(guardianMatch[1])}`;
    }

    return destination;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
        character,
    );
  }
}
