import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { extractAuthTokenFromCookie } from './auth-cookie';

interface JwtPayload {
  sub: number;
  identifier?: string;
  clientId?: string;
  scopes?: string[];
  type?: 'integration';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => extractAuthTokenFromCookie(request),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'integration') {
      const client = await this.prisma.integrationClient.findUnique({ where: { id: payload.sub } });
      if (!client?.ativo) throw new UnauthorizedException();

      return {
        id: client.id,
        clientId: client.clientId,
        nome: client.nome,
        scopes: client.scopes,
        type: 'integration' as const,
      };
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
