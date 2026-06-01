import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusDocumentoAdmissao } from '@prisma/client';

export class RevisarDocumentoDto {
  @IsEnum(StatusDocumentoAdmissao)
  status!: StatusDocumentoAdmissao;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  observacaoRh?: string;
}
