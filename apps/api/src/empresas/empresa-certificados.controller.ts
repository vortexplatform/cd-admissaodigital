import {
  Body,
  Controller,
  Get,
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
import { UploadCertificadoA1Dto } from './dto/upload-certificado-a1.dto';
import { EmpresaCertificadosService } from './empresa-certificados.service';

type AuthRequest = { user: { id: number } };
type UploadedMemoryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresaCertificadosController {
  constructor(private readonly certificados: EmpresaCertificadosService) {}

  @Get(':id/certificados-a1')
  findByEmpresa(@Request() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.certificados.findByEmpresa(req.user.id, id);
  }

  @Post(':id/certificados-a1')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadCertificadoA1Dto,
    @UploadedFile() file?: UploadedMemoryFile,
  ) {
    return this.certificados.upload(req.user.id, id, dto.senha, file);
  }
}
