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
import { CandidaturasService } from './candidaturas.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import { UpdateCandidaturaDataAdmissaoPrevistaDto } from './dto/update-candidatura-data-admissao-prevista.dto';
import { UpdateCandidaturaStatusDto } from './dto/update-candidatura-status.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CandidaturasController {
  constructor(private readonly candidaturas: CandidaturasService) {}

  @Post('requisicoes/:requisicaoId/candidaturas')
  create(
    @Request() req: { user: { id: number } },
    @Param('requisicaoId', ParseIntPipe) requisicaoId: number,
    @Body() dto: CreateCandidaturaDto,
  ) {
    return this.candidaturas.create(requisicaoId, dto, req.user.id);
  }

  @Get('requisicoes/:requisicaoId/candidaturas')
  findByRequisicao(@Param('requisicaoId', ParseIntPipe) requisicaoId: number) {
    return this.candidaturas.findByRequisicao(requisicaoId);
  }

  @Get('candidatos/:candidatoId/candidaturas')
  findByCandidato(@Param('candidatoId', ParseIntPipe) candidatoId: number) {
    return this.candidaturas.findByCandidato(candidatoId);
  }

  @Patch('candidaturas/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCandidaturaStatusDto) {
    return this.candidaturas.updateStatus(id, dto);
  }

  @Patch('candidaturas/:id/data-admissao-prevista')
  updateDataAdmissaoPrevista(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidaturaDataAdmissaoPrevistaDto,
  ) {
    return this.candidaturas.updateDataAdmissaoPrevista(id, dto);
  }

  @Delete('candidaturas/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.candidaturas.remove(id);
  }
}
