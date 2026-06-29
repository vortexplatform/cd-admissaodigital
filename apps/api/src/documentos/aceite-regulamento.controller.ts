import { Body, Controller, Get, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { extractPublicIp } from '../general/request.utils';
import { AceiteRegulamentoDto, AceiteRegulamentoService } from './aceite-regulamento.service';

type AuthRequest = {
  user: { id: number };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

@UseGuards(JwtAuthGuard)
@Controller('aceite-regulamento')
export class AceiteRegulamentoController {
  constructor(private readonly service: AceiteRegulamentoService) {}

  @Post()
  aceitar(
    @Request() req: AuthRequest,
    @Body() dto: AceiteRegulamentoDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.service.aceitar(req.user.id, dto, { ip: extractPublicIp(req), userAgent });
  }

  @Get('candidato')
  listar(@Request() req: AuthRequest) {
    return this.service.listarParaCandidato(req.user.id);
  }
}
