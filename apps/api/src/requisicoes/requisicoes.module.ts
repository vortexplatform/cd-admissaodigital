import { Module } from '@nestjs/common';
import { RequisicoesController } from './requisicoes.controller';
import { RequisicoesService } from './requisicoes.service';

@Module({
  controllers: [RequisicoesController],
  providers: [RequisicoesService],
})
export class RequisicoesModule {}
