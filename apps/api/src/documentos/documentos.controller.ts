import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentosService } from './documentos.service';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';

type AuthRequest = { user: { id: number } };
type UploadedMemoryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@UseGuards(JwtAuthGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  @Get('candidato')
  listMyDocumentos(@Request() req: AuthRequest) {
    return this.documentos.listMyDocumentos(req.user.id);
  }

  @Post('candidato/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMyDocumento(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: UploadedMemoryFile,
  ) {
    return this.documentos.uploadMyDocumento(req.user.id, id, file);
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
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }
}
