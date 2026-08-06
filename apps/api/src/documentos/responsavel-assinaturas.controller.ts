import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AssinaturasService } from './assinaturas.service';
import { VerifySignatureOtpDto } from './dto/verify-signature-otp.dto';

type RawRequest = Request & { socket?: { remoteAddress?: string } };

const extractIp = (req: RawRequest): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress;
};

const contentDispositionInline = (filename: string) => {
  const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

@Controller('documentos/assinaturas/responsavel')
export class ResponsavelAssinaturasController {
  constructor(private readonly assinaturas: AssinaturasService) {}

  @Get(':accessToken')
  listEnvelopes(@Param('accessToken') accessToken: string) {
    return this.assinaturas.findEnvelopesByAccessToken(accessToken);
  }

  @Post(':accessToken/otp')
  sendOtp(
    @Param('accessToken') accessToken: string,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.sendOtpResponsavel(accessToken, { ip: extractIp(req), userAgent });
  }

  @Post(':accessToken/otp/verify')
  verifyOtp(
    @Param('accessToken') accessToken: string,
    @Body() dto: VerifySignatureOtpDto,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.verifyOtpResponsavel(accessToken, dto.code, { ip: extractIp(req), userAgent });
  }

  @Get(':accessToken/documentos/:id/view')
  async viewDocument(
    @Param('accessToken') accessToken: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.assinaturas.viewDocumentResponsavel(accessToken, id, { ip: extractIp(req), userAgent });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDispositionInline(`documento-assinatura-${id}.pdf`),
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }

  @Post(':accessToken/documentos/:id/assinar')
  signDocument(
    @Param('accessToken') accessToken: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('sessionToken') sessionToken: string,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.signDocumentResponsavel(accessToken, id, sessionToken, { ip: extractIp(req), userAgent });
  }
}
