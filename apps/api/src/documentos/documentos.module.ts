import { Module } from '@nestjs/common';
import {
  DocumentoTemplateDefaultsController,
  DocumentoTemplatesController,
} from './documento-templates.controller';
import { DocumentoTemplatesService } from './documento-templates.service';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [DocumentosController, DocumentoTemplatesController, DocumentoTemplateDefaultsController],
  providers: [DocumentosService, DocumentoTemplatesService, OcrService],
  exports: [DocumentosService, DocumentoTemplatesService, OcrService],
})
export class DocumentosModule {}
