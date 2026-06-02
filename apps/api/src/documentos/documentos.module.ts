import { Module } from '@nestjs/common';
import { EmailService } from '../auth/email.service';
import { OtpService } from '../auth/otp.service';
import { SmsService } from '../auth/sms.service';
import { EmpresasModule } from '../empresas/empresas.module';
import { AssinaturasService } from './assinaturas.service';
import {
  DocumentoTemplateDefaultsController,
  DocumentoTemplatesController,
} from './documento-templates.controller';
import { DocumentoValidationService } from './documento-validation.service';
import { DocumentoTemplatesService } from './documento-templates.service';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { OcrService } from './ocr.service';
import { PdfDigitalSignatureService } from './pdf-digital-signature.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [EmpresasModule],
  controllers: [DocumentosController, DocumentoTemplatesController, DocumentoTemplateDefaultsController],
  providers: [
    DocumentosService,
    DocumentoTemplatesService,
    DocumentoValidationService,
    OcrService,
    S3StorageService,
    AssinaturasService,
    PdfDigitalSignatureService,
    OtpService,
    EmailService,
    SmsService,
  ],
  exports: [
    DocumentosService,
    DocumentoTemplatesService,
    DocumentoValidationService,
    OcrService,
    S3StorageService,
    AssinaturasService,
    PdfDigitalSignatureService,
  ],
})
export class DocumentosModule {}
