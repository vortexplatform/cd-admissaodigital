import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentoTemplatesService } from './documento-templates.service';
import { UpsertDocumentoTemplateDto } from './dto/documento-template.dto';

type AuthRequest = { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('empresas/:empresaId/documentos-template')
export class DocumentoTemplatesController {
  constructor(private readonly templates: DocumentoTemplatesService) {}

  @Get()
  list(@Request() req: AuthRequest, @Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.templates.list(req.user.id, empresaId);
  }

  @Post()
  create(
    @Request() req: AuthRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: UpsertDocumentoTemplateDto,
  ) {
    return this.templates.create(req.user.id, empresaId, dto);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertDocumentoTemplateDto,
  ) {
    return this.templates.update(req.user.id, empresaId, id, dto);
  }

  @Delete(':id')
  remove(
    @Request() req: AuthRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.templates.remove(req.user.id, empresaId, id);
  }

  @Post('seed')
  seedDefaults(@Request() req: AuthRequest, @Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.templates.seedDefaults(req.user.id, empresaId);
  }
}

@Controller('documentos-template')
export class DocumentoTemplateDefaultsController {
  constructor(private readonly templates: DocumentoTemplatesService) {}

  @Get('defaults')
  getDefaults() {
    return this.templates.getDefaults();
  }
}
