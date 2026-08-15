import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BiometriaService } from './biometria.service';
import { CreateSolicitacaoAssinaturaDto } from './dto/create-solicitacao-assinatura.dto';
import { ResultadoBiometriaDto } from './dto/resultado-biometria.dto';

type AuthRequest = { user: { id: number }; ip?: string };

@Controller('biometria')
export class BiometriaController {
  constructor(private readonly biometria: BiometriaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('envelopes/:id/assinatura')
  solicitarAssinatura(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSolicitacaoAssinaturaDto,
  ) {
    return this.biometria.solicitarAssinatura(req.user.id, id, dto.idfaceIp);
  }

  @UseGuards(JwtAuthGuard)
  @Post('envelopes/:id/assinatura-responsavel')
  solicitarAssinaturaResponsavel(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSolicitacaoAssinaturaDto,
  ) {
    return this.biometria.solicitarAssinaturaResponsavel(req.user.id, id, dto.idfaceIp);
  }

  @UseGuards(JwtAuthGuard)
  @Get('solicitacoes')
  listSolicitacoes(@Request() req: AuthRequest, @Query('candidatoId') candidatoId?: string) {
    return this.biometria.listSolicitacoesRh(
      req.user.id,
      candidatoId ? Number(candidatoId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('solicitacoes/:id')
  getSolicitacao(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.biometria.getSolicitacaoRh(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('idfaces')
  listIdfaces(@Request() req: AuthRequest) {
    return this.biometria.listIdfaces(req.user.id);
  }

  @Get('dispositivo/solicitacoes/pendentes')
  listPendentes() {
    return this.biometria.listPendentes();
  }

  @Post('dispositivo/solicitacoes/:id/assumir')
  assumir(
    @Param('id', ParseIntPipe) id: number,
    @Query('idfaceIp') idfaceIp?: string,
  ) {
    return this.biometria.assumirSolicitacao(idfaceIp ?? '', id);
  }

  @Post('dispositivo/solicitacoes/:id/resultado')
  resultado(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResultadoBiometriaDto,
    @Query('idfaceIp') idfaceIp?: string,
  ) {
    return this.biometria.registrarResultado(
      idfaceIp ?? '',
      id,
      dto,
      {
        ip: req.ip,
        userAgent: undefined,
      },
    );
  }
}
