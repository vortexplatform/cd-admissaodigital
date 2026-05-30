import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { VincularUsuarioEmpresaDto } from './dto/vincular-usuario-empresa.dto';
import { EmpresasService } from './empresas.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.empresas.create(dto);
  }

  @Get()
  findAll() {
    return this.empresas.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empresas.findOne(id);
  }

  @Get(':id/usuarios')
  findUsuarios(@Param('id', ParseIntPipe) id: number) {
    return this.empresas.findUsuarios(id);
  }

  @Post(':id/usuarios')
  vincularUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VincularUsuarioEmpresaDto,
  ) {
    return this.empresas.vincularUsuario(id, dto.userId);
  }

  @Delete(':id/usuarios/:userId')
  desvincularUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.empresas.desvincularUsuario(id, userId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpresaDto) {
    return this.empresas.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.empresas.remove(id);
  }
}
