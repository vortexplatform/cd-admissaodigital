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

@Controller('documentos/portal')
export class PortalDocumentosController {
  constructor(private readonly assinaturas: AssinaturasService) {}

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.assinaturas.findPortalSummary(token);
  }

  @Post(':token/otp')
  sendOtp(
    @Param('token') token: string,
    @Body('channel') channel: 'email' | 'sms',
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.sendOtpPortal(token, channel, { ip: extractIp(req), userAgent });
  }

  @Post(':token/otp/verify')
  verifyOtp(
    @Param('token') token: string,
    @Body('code') code: string,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.verifyOtpPortal(token, code, { ip: extractIp(req), userAgent });
  }

  @Get(':token/envelopes')
  listEnvelopes(
    @Param('token') token: string,
    @Headers('x-session-token') sessionToken: string,
  ) {
    return this.assinaturas.listEnvelopesByPortalToken(token, sessionToken);
  }

  @Get(':token/documentos/:id/view')
  async viewDocument(
    @Param('token') token: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.assinaturas.viewDocumentPortal(token, id, { ip: extractIp(req), userAgent });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDispositionInline(`documento-assinatura-${id}.pdf`),
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }

  @Post(':token/documentos/:id/assinar')
  signDocument(
    @Param('token') token: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('sessionToken') sessionToken: string,
    @Req() req: RawRequest,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.signDocumentPortal(token, id, sessionToken, { ip: extractIp(req), userAgent });
  }
}
