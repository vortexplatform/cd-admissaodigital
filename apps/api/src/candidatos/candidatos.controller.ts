import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCandidatoDependenteDto } from './dto/create-candidato-dependente.dto';
import { CreateCandidatoEtapaDto } from './dto/create-candidato-etapa.dto';
import { CreateCandidatoValeTransporteDto } from './dto/create-candidato-vale-transporte.dto';
import { CreateCandidatoDto } from './dto/create-candidato.dto';
import { UpdateCandidatoDependenteDto } from './dto/update-candidato-dependente.dto';
import { UpdateCandidatoEtapaDto } from './dto/update-candidato-etapa.dto';
import { UpdateCandidatoValeTransporteDto } from './dto/update-candidato-vale-transporte.dto';
import { UpdateCandidatoDto } from './dto/update-candidato.dto';
import { CandidatosService } from './candidatos.service';

@UseGuards(JwtAuthGuard)
@Controller('candidatos')
export class CandidatosController {
  constructor(private readonly candidatos: CandidatosService) {}

  @Post()
  create(@Request() req: { user: { id: number } }, @Body() dto: CreateCandidatoDto) {
    return this.candidatos.create(dto, req.user.id);
  }

  @Get()
  findAll(
    @Query('nome') nome?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('situacao') situacao?: string,
    @Query('filial') filial?: string,
    @Query('cidadeVagaId') cidadeVagaId?: string,
    @Query('cpf') cpf?: string,
  ) {
    return this.candidatos.findPaginated({ nome, cpf, page, limit, situacao, filial, cidadeVagaId });
  }

  @Get('search')
  search(@Query('nome') nome?: string, @Query('limit') limit?: string) {
    return this.candidatos.searchByNome(nome, limit);
  }

  @Get('by-cpf')
  findByCpf(@Query('cpf') cpf?: string) {
    return this.candidatos.findByCpf(cpf);
  }

  @Get('counts')
  countByTab(
    @Query('nome') nome?: string,
    @Query('filial') filial?: string,
    @Query('cidadeVagaId') cidadeVagaId?: string,
    @Query('cpf') cpf?: string,
  ) {
    return this.candidatos.countByTab(nome, filial, cidadeVagaId, cpf);
  }

  @Get('filiais')
  findFiliais() {
    return this.candidatos.findFiliais();
  }

  @Post(':id/dependentes')
  createDependente(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCandidatoDependenteDto,
  ) {
    return this.candidatos.createDependente(id, dto, req.user.id);
  }

  @Patch(':id/dependentes/:dependenteId')
  updateDependente(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Param('dependenteId', ParseIntPipe) dependenteId: number,
    @Body() dto: UpdateCandidatoDependenteDto,
  ) {
    return this.candidatos.updateDependente(id, dependenteId, dto, req.user.id);
  }

  @Delete(':id/dependentes/:dependenteId')
  removeDependente(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependenteId', ParseIntPipe) dependenteId: number,
  ) {
    return this.candidatos.removeDependente(id, dependenteId);
  }

  @Post(':id/vale-transportes')
  createValeTransporte(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCandidatoValeTransporteDto,
  ) {
    return this.candidatos.createValeTransporte(id, dto, req.user.id);
  }

  @Patch(':id/vale-transportes/:valeTransporteId')
  updateValeTransporte(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Param('valeTransporteId', ParseIntPipe) valeTransporteId: number,
    @Body() dto: UpdateCandidatoValeTransporteDto,
  ) {
    return this.candidatos.updateValeTransporte(id, valeTransporteId, dto, req.user.id);
  }

  @Delete(':id/vale-transportes/:valeTransporteId')
  removeValeTransporte(
    @Param('id', ParseIntPipe) id: number,
    @Param('valeTransporteId', ParseIntPipe) valeTransporteId: number,
  ) {
    return this.candidatos.removeValeTransporte(id, valeTransporteId);
  }

  @Post(':id/etapas')
  createEtapa(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCandidatoEtapaDto,
  ) {
    return this.candidatos.createEtapa(id, dto, req.user.id);
  }

  @Patch(':id/etapas/:etapaId')
  updateEtapa(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Param('etapaId', ParseIntPipe) etapaId: number,
    @Body() dto: UpdateCandidatoEtapaDto,
  ) {
    return this.candidatos.updateEtapa(id, etapaId, dto, req.user.id);
  }

  @Delete(':id/etapas/:etapaId')
  removeEtapa(
    @Param('id', ParseIntPipe) id: number,
    @Param('etapaId', ParseIntPipe) etapaId: number,
  ) {
    return this.candidatos.removeEtapa(id, etapaId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidatos.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidatoDto,
  ) {
    return this.candidatos.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.candidatos.remove(id);
  }
}
