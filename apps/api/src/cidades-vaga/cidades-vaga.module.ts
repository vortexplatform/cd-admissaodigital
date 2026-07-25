import { Module } from '@nestjs/common';
import { CidadesVagaController } from './cidades-vaga.controller';
import { CidadesVagaService } from './cidades-vaga.service';

@Module({
  controllers: [CidadesVagaController],
  providers: [CidadesVagaService],
})
export class CidadesVagaModule {}
