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
import { CreateCandidatoDto } from './dto/create-candidato.dto';
import { UpdateCandidatoDependenteDto } from './dto/update-candidato-dependente.dto';
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
  ) {
    return this.candidatos.findPaginated({ nome, page, limit });
  }

  @Get('search')
  search(@Query('nome') nome?: string, @Query('limit') limit?: string) {
    return this.candidatos.searchByNome(nome, limit);
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
