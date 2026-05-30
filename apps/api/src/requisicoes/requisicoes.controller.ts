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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequisicaoDto } from './dto/create-requisicao.dto';
import { UpdateRequisicaoDto } from './dto/update-requisicao.dto';
import { RequisicoesService } from './requisicoes.service';

@UseGuards(JwtAuthGuard)
@Controller('requisicoes')
export class RequisicoesController {
  constructor(private readonly requisicoes: RequisicoesService) {}

  @Post()
  create(@Request() req: { user: { id: number } }, @Body() dto: CreateRequisicaoDto) {
    return this.requisicoes.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.requisicoes.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requisicoes.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRequisicaoDto) {
    return this.requisicoes.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.requisicoes.remove(id);
  }
}
