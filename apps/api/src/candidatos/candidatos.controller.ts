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
  create(@Body() dto: CreateCandidatoDto) {
    return this.candidatos.create(dto);
  }

  @Get()
  findAll(
    @Query('nome') nome?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('situacao') situacao?: string,
    @Query('filial') filial?: string,
    @Query('cidadeVagaId') cidadeVagaId?: string,
  ) {
    return this.candidatos.findPaginated({ nome, page, limit, situacao, filial, cidadeVagaId });
  }

  @Get('search')
  search(@Query('nome') nome?: string, @Query('limit') limit?: string) {
    return this.candidatos.searchByNome(nome, limit);
  }

  @Get('counts')
  countByTab(
    @Query('nome') nome?: string,
    @Query('filial') filial?: string,
    @Query('cidadeVagaId') cidadeVagaId?: string,
  ) {
    return this.candidatos.countByTab(nome, filial, cidadeVagaId);
  }

  @Get('filiais')
  findFiliais() {
    return this.candidatos.findFiliais();
  }

  @Post(':id/dependentes')
  createDependente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCandidatoDependenteDto,
  ) {
    return this.candidatos.createDependente(id, dto);
  }

  @Patch(':id/dependentes/:dependenteId')
  updateDependente(
    @Param('id', ParseIntPipe) id: number,
    @Param('dependenteId', ParseIntPipe) dependenteId: number,
    @Body() dto: UpdateCandidatoDependenteDto,
  ) {
    return this.candidatos.updateDependente(id, dependenteId, dto);
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
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCandidatoValeTransporteDto,
  ) {
    return this.candidatos.createValeTransporte(id, dto);
  }

  @Patch(':id/vale-transportes/:valeTransporteId')
  updateValeTransporte(
    @Param('id', ParseIntPipe) id: number,
    @Param('valeTransporteId', ParseIntPipe) valeTransporteId: number,
    @Body() dto: UpdateCandidatoValeTransporteDto,
  ) {
    return this.candidatos.updateValeTransporte(id, valeTransporteId, dto);
  }

  @Delete(':id/vale-transportes/:valeTransporteId')
  removeValeTransporte(
    @Param('id', ParseIntPipe) id: number,
    @Param('valeTransporteId', ParseIntPipe) valeTransporteId: number,
  ) {
    return this.candidatos.removeValeTransporte(id, valeTransporteId);
  }

  @Post(':id/etapas')
  createEtapa(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCandidatoEtapaDto) {
    return this.candidatos.createEtapa(id, dto);
  }

  @Patch(':id/etapas/:etapaId')
  updateEtapa(
    @Param('id', ParseIntPipe) id: number,
    @Param('etapaId', ParseIntPipe) etapaId: number,
    @Body() dto: UpdateCandidatoEtapaDto,
  ) {
    return this.candidatos.updateEtapa(id, etapaId, dto);
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCandidatoDto) {
    return this.candidatos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.candidatos.remove(id);
  }
}
