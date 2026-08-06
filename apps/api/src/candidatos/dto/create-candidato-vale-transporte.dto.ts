import { IsIn, IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateCandidatoValeTransporteDto {
  @IsIn(['ONIBUS', 'METRO', 'TREM'])
  tipoTransporte!: string;

  @IsIn(['RESIDENCIA_TRABALHO', 'TRABALHO_RESIDENCIA'])
  tipoTrajeto!: string;

  @IsString()
  @IsNotEmpty()
  transporteUsado!: string;

  @IsNumber()
  @Min(0)
  tarifaUnitaria!: number;

  @IsInt()
  @Min(1)
  valesPorDia!: number;
}
