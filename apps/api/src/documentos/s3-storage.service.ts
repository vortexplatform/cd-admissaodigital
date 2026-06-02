import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
    this.client = new S3Client({
      region: this.config.getOrThrow<string>('AWS_S3_REGION'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  buildKey(cpf: string | null, documentoId: number, originalname: string): string {
    const cpfSlug = cpf ? cpf.replace(/\D/g, '') : 'sem-cpf';
    const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documentos/${cpfSlug}/${documentoId}-${Date.now()}-${safeName}`;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao enviar arquivo para S3: ${(err as Error).message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return this.streamToBuffer(response.Body as Readable);
    } catch (err) {
      throw new InternalServerErrorException(`Falha ao baixar arquivo do S3: ${(err as Error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // Ignora erros de deleção — objeto pode já não existir
    }
  }

  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
