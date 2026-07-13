import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCandidatoValeTransporteDto {
  @IsIn(['ONIBUS', 'METRO', 'TREM'])
  @IsOptional()
  tipoTransporte?: string;

  @IsIn(['RESIDENCIA_TRABALHO', 'TRABALHO_RESIDENCIA'])
  @IsOptional()
  tipoTrajeto?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  transporteUsado?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  preco?: number;
}
