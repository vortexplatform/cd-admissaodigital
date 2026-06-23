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
}
