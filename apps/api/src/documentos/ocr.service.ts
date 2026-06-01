import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import { PDFParse } from 'pdf-parse';

export interface OcrResult {
  text: string;
  campos: {
    cpf?: string;
    data?: string;
  };
}

const CPF_REGEX = /\b\d{3}[. -]?\d{3}[. -]?\d{3}[-. ]?\d{2}\b/g;
const DATA_REGEX = /\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\b/;

const normalizeCpf = (raw: string) => raw.replace(/\D/g, '');

function extrairCampos(text: string): OcrResult['campos'] {
  const campos: OcrResult['campos'] = {};

  const cpfMatches = [...text.matchAll(CPF_REGEX)];
  if (cpfMatches.length > 0) {
    campos.cpf = normalizeCpf(cpfMatches[0][0]);
  }

  const dataMatch = text.match(DATA_REGEX);
  if (dataMatch) {
    campos.data = `${dataMatch[1]}/${dataMatch[2]}/${dataMatch[3]}`;
  }

  return campos;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly auth: GoogleAuth | null = null;

  constructor(private readonly config: ConfigService) {
    const credentialsJson = this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson) as object;
        this.auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-vision'],
        });
      } catch {
        this.logger.error('GOOGLE_APPLICATION_CREDENTIALS_JSON inválido — OCR de imagem desabilitado.');
      }
    }
  }

  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    try {
      if (mimeType === 'application/pdf') {
        return this.extractFromPdf(buffer);
      }
      return this.extractFromImage(buffer);
    } catch (err) {
      this.logger.warn(`OCR falhou: ${(err as Error).message}`);
      return { text: '', campos: {} };
    }
  }

  private async extractFromPdf(buffer: Buffer): Promise<OcrResult> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text = result.text ?? '';
    await parser.destroy();
    return { text, campos: extrairCampos(text) };
  }

  private async extractFromImage(buffer: Buffer): Promise<OcrResult> {
    if (!this.auth) {
      this.logger.warn('GOOGLE_APPLICATION_CREDENTIALS_JSON não configurado — OCR de imagem desabilitado.');
      return { text: '', campos: {} };
    }

    const client = await this.auth.getClient();
    const { token } = await client.getAccessToken();

    const response = await axios.post<{
      responses: { fullTextAnnotation?: { text: string } }[];
    }>(
      'https://vision.googleapis.com/v1/images:annotate',
      {
        requests: [
          {
            image: { content: buffer.toString('base64') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
            imageContext: { languageHints: ['pt-BR', 'pt'] },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const text = response.data.responses[0]?.fullTextAnnotation?.text ?? '';
    return { text, campos: extrairCampos(text) };
  }
}
