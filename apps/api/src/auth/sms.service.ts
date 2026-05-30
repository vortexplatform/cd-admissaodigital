import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly sns: SNSClient;

  constructor(private readonly config: ConfigService) {
    this.sns = new SNSClient({
      region: config.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const result = await this.sns.send(
      new PublishCommand({
        PhoneNumber: phone,
        Message: `Admissão Digital: seu código de acesso é ${code}. Expira em 10 minutos.`,
      }),
    );
    this.logger.log(`OTP enviado para ${phone} — MessageId: ${result.MessageId}`);
  }
}
