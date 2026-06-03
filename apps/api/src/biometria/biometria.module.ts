import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { BiometriaController } from './biometria.controller';
import { BiometriaService } from './biometria.service';

@Module({
  imports: [DocumentosModule],
  controllers: [BiometriaController],
  providers: [BiometriaService],
})
export class BiometriaModule {}
