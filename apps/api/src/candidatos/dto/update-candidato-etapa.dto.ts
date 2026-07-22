import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCandidatoEtapaDto {
  @IsInt()
  @IsOptional()
  codigoEtapa?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  descricaoEtapa?: string;

  @IsDateString()
  @IsOptional()
  data?: string;

  @IsInt()
  @IsOptional()
  sequencia?: number;

  @IsString()
  @IsOptional()
  observacao?: string;
}
