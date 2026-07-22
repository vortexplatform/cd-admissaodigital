import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCandidatoEtapaDto {
  @IsInt()
  codigoEtapa!: number;

  @IsString()
  @IsNotEmpty()
  descricaoEtapa!: string;

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
