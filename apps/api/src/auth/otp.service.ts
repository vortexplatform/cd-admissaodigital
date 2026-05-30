import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  generate(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async save(identifier: string, code: string): Promise<void> {
    await this.prisma.codeOtp.updateMany({
      where: { identifier, used: false },
      data: { used: true },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.codeOtp.create({ data: { identifier, code, expiresAt } });
  }

  async verify(identifier: string, code: string): Promise<boolean> {
    const otp = await this.prisma.codeOtp.findFirst({
      where: {
        identifier,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return false;

    await this.prisma.codeOtp.update({ where: { id: otp.id }, data: { used: true } });
    return true;
  }
}
