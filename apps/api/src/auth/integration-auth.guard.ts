import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

interface IntegrationRequestUser {
  type?: string;
}

@Injectable()
export class IntegrationAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: IntegrationRequestUser }>();
    if (request.user?.type === 'integration') return true;

    throw new ForbiddenException('Acesso restrito a integrações.');
  }
}
