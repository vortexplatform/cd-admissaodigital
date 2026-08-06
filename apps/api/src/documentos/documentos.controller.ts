import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { extractPublicIp } from '../general/request.utils';
import { AssinaturasService } from './assinaturas.service';
import { DocumentosService } from './documentos.service';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { VerifySignatureOtpDto } from './dto/verify-signature-otp.dto';

type AuthRequest = {
  user: { id: number };
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type UploadedMemoryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const ASSINATURAS_RH_PAGE_LIMIT = 20;

const contentDispositionInline = (filename: string) => {
  const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(
    private readonly documentos: DocumentosService,
    private readonly assinaturas: AssinaturasService,
  ) {}

  @Get('candidato')
  listMyDocumentos(@Request() req: AuthRequest) {
    return this.documentos.listMyDocumentos(req.user.id);
  }

  @Get('assinaturas/candidato')
  listMyAssinaturas(@Request() req: AuthRequest) {
    return this.assinaturas.listMyEnvelopes(req.user.id);
  }

  @Post('assinaturas/candidato/candidaturas/:id/gerar')
  gerarAssinaturasCandidato(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.assinaturas.gerarParaCandidato(req.user.id, id);
  }

  @Get('assinaturas/rh')
  listAssinaturasRh(
    @Request() req: AuthRequest,
    @Query('page') page = '1',
    @Query('candidatoId') candidatoId?: string,
  ) {
    return this.assinaturas.listForRh(
      req.user.id,
      Math.max(1, Number(page)),
      ASSINATURAS_RH_PAGE_LIMIT,
      candidatoId ? Number(candidatoId) : undefined,
    );
  }

  @Get('assinaturas/rh/filtros')
  listAssinaturasRhFiltros(@Request() req: AuthRequest) {
    return this.assinaturas.listFiltrosRh(req.user.id);
  }

  @Get('assinaturas/rh/lista')
  listAssinaturasRhPaginado(
    @Request() req: AuthRequest,
    @Query('page') page = '1',
    @Query('situacao') situacao: 'PENDENTES' | 'CONCLUIDAS' | 'TODAS' | 'APROVADOS' = 'PENDENTES',
    @Query('filial') filial?: string,
    @Query('setor') setor?: string,
    @Query('cargo') cargo?: string,
  ) {
    return this.assinaturas.listForRhPaginado(
      req.user.id,
      Math.max(1, Number(page)),
      ASSINATURAS_RH_PAGE_LIMIT,
      situacao,
      {
        filial: filial ? Number(filial) : undefined,
        setor: setor || undefined,
        cargo: cargo || undefined,
      },
    );
  }

  @Post('assinaturas/rh/candidaturas/:id/gerar')
  gerarAssinaturasRh(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.assinaturas.gerarParaRh(req.user.id, id);
  }

  @Delete('assinaturas/rh/candidaturas/:id')
  excluirAssinaturasRh(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.assinaturas.excluirParaRh(req.user.id, id);
  }

  @Post('assinaturas/:id/otp')
  sendSignatureOtp(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.sendOtp(req.user.id, id, { ip: extractPublicIp(req), userAgent });
  }

  @Post('assinaturas/:id/otp/verify')
  verifySignatureOtp(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifySignatureOtpDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.verifyOtp(req.user.id, id, dto.code, { ip: extractPublicIp(req), userAgent });
  }

  @Post('assinaturas/documentos/:id/assinar')
  signDocumento(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('sessionToken') sessionToken: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.assinaturas.signDocument(req.user.id, id, sessionToken, { ip: extractPublicIp(req), userAgent });
  }

  @Get('assinaturas/documentos/:id/view')
  async viewDocumentoAssinatura(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.assinaturas.viewDocument(req.user.id, id, { ip: extractPublicIp(req), userAgent });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDispositionInline(`documento-assinatura-${id}.pdf`),
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }

  @Get('assinaturas/rh/documentos/:id/view')
  async viewDocumentoAssinaturaRh(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.assinaturas.viewDocumentForRh(req.user.id, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDispositionInline(`documento-assinatura-${id}.pdf`),
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }

  @Post('candidato/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMyDocumento(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: UploadedMemoryFile,
    @Query('candidaturaId') candidaturaId?: string,
    @Query('templateId') templateId?: string,
    @Query('codigo') codigo?: string,
    @Query('confirmarEnvio') confirmarEnvio?: string,
    @Query('observacaoCandidato') observacaoCandidato?: string,
  ) {
    return this.documentos.uploadMyDocumento(
      req.user.id,
      id,
      file,
      candidaturaId ? Number(candidaturaId) : undefined,
      templateId ? Number(templateId) : undefined,
      codigo,
      confirmarEnvio === 'true' || confirmarEnvio === '1',
      observacaoCandidato,
    );
  }

  @Delete('candidato/:id')
  deleteMyDocumento(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.documentos.deleteMyDocumento(req.user.id, id);
  }

  @Get('rh')
  listForRh() {
    return this.documentos.listForRh();
  }

  @Post('rh/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadRhDocumento(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: UploadedMemoryFile,
  ) {
    return this.documentos.uploadRhDocumento(req.user.id, id, file);
  }

  @Patch('rh/:id/revisao')
  revisarDocumento(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarDocumentoDto,
  ) {
    return this.documentos.revisarDocumento(req.user.id, id, dto);
  }

  @Delete('rh/:id')
  deleteRhDocumento(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.documentos.deleteRhDocumento(req.user.id, id);
  }

  @Get(':id/view')
  async viewDocumento(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } = await this.documentos.getDocumentoFile(req.user.id, id);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': contentDispositionInline(filename),
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }
}
