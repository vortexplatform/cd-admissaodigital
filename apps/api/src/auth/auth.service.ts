import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { UsersService } from '../users/users.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private detectType(identifier: string): 'email' | 'phone' {
    return EMAIL_REGEX.test(identifier) ? 'email' : 'phone';
  }

  async sendOtp(identifier: string): Promise<void> {
    const code = this.otp.generate();
    await this.otp.save(identifier, code);

    if (this.detectType(identifier) === 'email') {
      await this.email.sendOtp(identifier, code);
    } else {
      await this.sms.sendOtp(identifier, code);
    }
  }

  async verifyOtp(identifier: string, code: string) {
    const valid = await this.otp.verify(identifier, code);
    if (!valid) throw new UnauthorizedException('Código inválido ou expirado.');

    const type = this.detectType(identifier);
    const { user, isNewUser } = await this.users.findOrCreate(identifier, type);

    const accessToken = this.jwt.sign({ sub: user.id, identifier });
    return { accessToken, user, isNewUser };
  }
}
