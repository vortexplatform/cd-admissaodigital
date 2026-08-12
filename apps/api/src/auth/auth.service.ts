import { createHash, randomBytes, timingSafeEqual, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';
import * as bcrypt from 'bcrypt';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const scrypt = promisify(scryptCallback);
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000;
const INTEGRATION_TOKEN_EXPIRES_IN = '1h';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
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

  async verifyOtp(identifier: string, cpf: string, code: string) {
    const valid = await this.otp.verify(identifier, code);
    if (!valid) throw new UnauthorizedException('Código inválido ou expirado.');

    const type = this.detectType(identifier);
    const { user, isNewUser } = await this.users.findOrCreate(identifier, type, cpf);
    const session = await this.users.findSessionById(user.id);
    if (!session) throw new NotFoundException('Usuário não encontrado.');

    const tokens = await this.createUserTokens(user.id, identifier);
    return { ...tokens, ...session, isNewUser };
  }

  async loginWithPassword(cpf: string, password: string) {
    const digits = cpf.replace(/\D/g, '').padStart(11, '0');
    const user = await this.prisma.user.findUnique({ where: { cpf: digits } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    if (user.role !== 'RH' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Este acesso é exclusivo para usuários RH.');
    }

    if (!user.passwordHash) {
      const accessToken = this.jwt.sign(
        { sub: user.id, scope: 'set-password' },
        { expiresIn: '10m' },
      );
      return { requiresPasswordSetup: true as const, accessToken };
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const session = await this.users.findSessionById(user.id);
    if (!session) throw new NotFoundException('Usuário não encontrado.');

    const tokens = await this.createUserTokens(user.id, user.cpf ?? String(user.id));
    return { requiresPasswordSetup: false as const, ...tokens, ...session };
  }

  async setPassword(userId: number, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.role !== 'RH' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Este acesso é exclusivo para usuários RH.');
    }

    if (user.passwordHash) {
      throw new BadRequestException('Senha já definida. Use a tela de login.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    const session = await this.users.findSessionById(userId);
    if (!session) throw new NotFoundException('Usuário não encontrado.');

    const tokens = await this.createUserTokens(userId, user.cpf ?? String(userId));
    return { ...tokens, ...session };
  }

  async refreshSession(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sessão expirada.');
    }

    const user = await this.users.findById(storedToken.userId);
    if (!user) throw new UnauthorizedException('Sessão expirada.');

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const identifier = user.email ?? user.telefone ?? String(user.id);
    const tokens = await this.createUserTokens(user.id, identifier);
    const session = await this.getSession(user.id);

    return { ...tokens, ...session };
  }

  async revokeRefreshToken(refreshToken: string | null) {
    if (!refreshToken) return;

    await this.prisma.refreshToken
      .update({
        where: { tokenHash: this.hashRefreshToken(refreshToken) },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  async getSession(userId: number) {
    const session = await this.users.findSessionById(userId);
    if (!session) throw new NotFoundException('Usuário não encontrado.');

    return session;
  }

  async createIntegrationToken(clientId: string, clientSecret: string) {
    const client = await this.prisma.integrationClient.findUnique({ where: { clientId } });
    if (!client?.ativo) throw new UnauthorizedException('Credenciais inválidas.');

    const validSecret = await this.verifyClientSecret(clientSecret, client.clientSecretHash);
    if (!validSecret) throw new UnauthorizedException('Credenciais inválidas.');

    await this.prisma.integrationClient.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    });

    const accessToken = this.jwt.sign(
      {
        sub: client.id,
        clientId: client.clientId,
        scopes: client.scopes,
        type: 'integration',
      },
      { expiresIn: INTEGRATION_TOKEN_EXPIRES_IN },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      scopes: client.scopes,
    };
  }

  private async createUserTokens(userId: number, identifier: string) {
    const accessToken = this.jwt.sign({ sub: userId, identifier }, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashRefreshToken(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private async verifyClientSecret(clientSecret: string, clientSecretHash: string) {
    const [salt, key] = clientSecretHash.split(':');
    if (!salt || !key) return false;

    const derivedKey = (await scrypt(clientSecret, salt, 64)) as Buffer;
    const storedKey = Buffer.from(key, 'hex');
    if (storedKey.length !== derivedKey.length) return false;

    return timingSafeEqual(storedKey, derivedKey);
  }
}
