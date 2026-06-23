import { Module } from '@nestjs/common';
import { IntegracaoSeniorController } from './integracao-senior.controller';
import { IntegracaoSeniorService } from './integracao-senior.service';
import { GeneralModule } from '../general/general.module';

@Module({
  imports: [GeneralModule],
  controllers: [IntegracaoSeniorController],
  providers: [IntegracaoSeniorService],
  exports: [IntegracaoSeniorService],
})
export class IntegracaoSeniorModule {}
