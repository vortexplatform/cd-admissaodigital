import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { extractPublicIp } from '../general/request.utils';
import { AssinaturaPresencialService } from './assinatura-presencial.service';
import { PosicaoAssinaturaPresencialDto } from './dto/assinatura-presencial.dto';

type AuthRequest = {
  user: { id: number };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type UploadedMemoryFile = { buffer: Buffer; mimetype: string; size: number };

@UseGuards(JwtAuthGuard)
@Controller('documentos/assinaturas/presencial')
export class AssinaturaPresencialController {
  constructor(private readonly presencial: AssinaturaPresencialService) {}

  @Post('envelopes/:id/iniciar')
  iniciar(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.presencial.iniciar(req.user.id, id, { ip: extractPublicIp(req), userAgent });
  }

  @Get('sessoes/:id')
  getSession(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.presencial.getSession(req.user.id, id);
  }

  @Post('sessoes/:sessionId/documentos/:documentoId')
  @UseInterceptors(FileInterceptor('assinatura'))
  salvarAssinatura(
    @Request() req: AuthRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @Body() posicao: PosicaoAssinaturaPresencialDto,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.presencial.salvarAssinatura(req.user.id, sessionId, documentoId, posicao, file, {
      ip: extractPublicIp(req),
      userAgent,
    });
  }

  @Post('sessoes/:id/foto')
  @UseInterceptors(FileInterceptor('foto'))
  salvarFoto(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.presencial.salvarFoto(req.user.id, id, file, {
      ip: extractPublicIp(req),
      userAgent,
    });
  }

  @Post('sessoes/:id/concluir')
  concluir(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.presencial.concluir(req.user.id, id, { ip: extractPublicIp(req), userAgent });
  }
}
