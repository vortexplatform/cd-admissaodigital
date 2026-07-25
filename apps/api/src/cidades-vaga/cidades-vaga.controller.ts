import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CidadesVagaService } from './cidades-vaga.service';

@UseGuards(JwtAuthGuard)
@Controller('cidades-vaga')
export class CidadesVagaController {
  constructor(private readonly cidadesVaga: CidadesVagaService) {}

  @Get()
  findAll() {
    return this.cidadesVaga.findAll();
  }
}
