import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      secure: false,
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
}
