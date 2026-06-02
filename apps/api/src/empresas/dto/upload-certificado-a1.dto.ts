import { IsString, MinLength } from 'class-validator';

export class UploadCertificadoA1Dto {
  @IsString()
  @MinLength(1)
  senha!: string;
}
