import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BiometriaService } from './biometria.service';
import { CreateBiometriaDispositivoDto } from './dto/create-biometria-dispositivo.dto';
import { ResultadoBiometriaDto } from './dto/resultado-biometria.dto';

type AuthRequest = { user: { id: number }; ip?: string };

const deviceTokenFromHeaders = (authorization?: string, xDeviceToken?: string) => {
  if (xDeviceToken) return xDeviceToken;
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);
  return '';
};

@Controller('biometria')
export class BiometriaController {
  constructor(private readonly biometria: BiometriaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('dispositivos')
  listDispositivos(@Request() req: AuthRequest) {
    return this.biometria.listDispositivos(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('dispositivos')
  createDispositivo(@Request() req: AuthRequest, @Body() dto: CreateBiometriaDispositivoDto) {
    return this.biometria.createDispositivo(req.user.id, dto.nome);
  }

  @UseGuards(JwtAuthGuard)
  @Post('envelopes/:id/assinatura')
  solicitarAssinatura(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.biometria.solicitarAssinatura(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('solicitacoes')
  listSolicitacoes(@Request() req: AuthRequest, @Query('candidatoId') candidatoId?: string) {
    return this.biometria.listSolicitacoesRh(
      req.user.id,
      candidatoId ? Number(candidatoId) : undefined,
    );
  }

  @Get('dispositivo/solicitacoes/pendentes')
  listPendentes(
    @Headers('authorization') authorization?: string,
    @Headers('x-device-token') xDeviceToken?: string,
  ) {
    return this.biometria.listPendentesForDispositivo(
      deviceTokenFromHeaders(authorization, xDeviceToken),
    );
  }

  @Post('dispositivo/solicitacoes/:id/assumir')
  assumir(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
    @Headers('x-device-token') xDeviceToken?: string,
  ) {
    return this.biometria.assumirSolicitacao(
      deviceTokenFromHeaders(authorization, xDeviceToken),
      id,
    );
  }

  @Post('dispositivo/solicitacoes/:id/resultado')
  resultado(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResultadoBiometriaDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-device-token') xDeviceToken?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.biometria.registrarResultado(
      deviceTokenFromHeaders(authorization, xDeviceToken),
      id,
      dto,
      {
        ip: req.ip,
        userAgent,
      },
    );
  }
}
