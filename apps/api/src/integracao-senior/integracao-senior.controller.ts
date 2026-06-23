import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegracaoSeniorService } from './integracao-senior.service';
import { GerarAdmissaoDto } from './gerar-admissao.dto';

@UseGuards(JwtAuthGuard)
@Controller('integracao-senior')
export class IntegracaoSeniorController {
  constructor(private readonly integracaoSenior: IntegracaoSeniorService) {}

  @Post('admissao')
  gerarAdmissao(
    @Request() req: { user: { id: number } },
    @Body() dto: GerarAdmissaoDto,
  ) {
    return this.integracaoSenior.gerarAdmissao(dto, req.user.id);
  }

  @Get('candidaturas/:id/matricula-ativa')
  consultarMatriculaAtiva(@Param('id', ParseIntPipe) id: number) {
    return this.integracaoSenior.consultarMatriculaAtiva(id);
  }

  @Post('candidaturas/:id/cancelar-efetivacao')
  cancelarEfetivacao(@Param('id', ParseIntPipe) id: number) {
    return this.integracaoSenior.cancelarEfetivacao(id);
  }
}
