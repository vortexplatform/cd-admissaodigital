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
import { CreateCandidatoDto } from './dto/create-candidato.dto';
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
