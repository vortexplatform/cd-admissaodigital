import { Injectable } from '@nestjs/common';
import { SignPdf } from '@signpdf/signpdf';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class PdfDigitalSignatureService {
  async signWithPfx(pdfBuffer: Buffer, pfx: Buffer, password: string) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdflibAddPlaceholder({
      pdfDoc,
      reason: 'Certificacao digital da empresa para integridade do documento admissionais.',
      contactInfo: 'Admissao Digital',
      name: 'Admissao Digital',
      location: 'Brasil',
      signatureLength: 16_000,
    });

    const pdfWithPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    const signer = new P12Signer(pfx, { passphrase: password });

    return Buffer.from(await new SignPdf().sign(pdfWithPlaceholder, signer));
  }
}
