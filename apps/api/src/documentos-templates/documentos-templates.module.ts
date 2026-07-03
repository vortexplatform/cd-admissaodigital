import { Module } from '@nestjs/common';
import { GeneralModule } from '../general/general.module';
import { AcordoDomingosFeriadosService } from './relatorios/acordo-domingos-feriados.service';
import { AutorizacaoPlanoSaudeService } from './relatorios/autorizacao-plano-saude.service';
import { ContratoExperienciaService } from './relatorios/contrato-experiencia.service';
import { DeclaracaoTreinamentoService } from './relatorios/declaracao-treinamento.service';
import { DocumentosTemplatesController } from './documentos-templates.controller';
import { DocumentosTemplatesService } from './documentos-templates.service';
import { TermoProrrogacaoExperienciaService } from './relatorios/termo-prorrogacao-experiencia.service';

@Module({
  imports: [GeneralModule],
  controllers: [DocumentosTemplatesController],
  providers: [DocumentosTemplatesService, ContratoExperienciaService, DeclaracaoTreinamentoService, AcordoDomingosFeriadosService, TermoProrrogacaoExperienciaService, AutorizacaoPlanoSaudeService],
  exports: [DocumentosTemplatesService],
})
export class DocumentosTemplatesModule {}
