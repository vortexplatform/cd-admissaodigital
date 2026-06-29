import { Module } from '@nestjs/common';
import { GeneralModule } from '../general/general.module';
import { ContratoExperienciaService } from './contrato-experiencia.service';
import { DeclaracaoTreinamentoService } from './declaracao-treinamento.service';
import { DocumentosTemplatesController } from './documentos-templates.controller';
import { DocumentosTemplatesService } from './documentos-templates.service';

@Module({
  imports: [GeneralModule],
  controllers: [DocumentosTemplatesController],
  providers: [DocumentosTemplatesService, ContratoExperienciaService, DeclaracaoTreinamentoService],
  exports: [DocumentosTemplatesService],
})
export class DocumentosTemplatesModule {}
