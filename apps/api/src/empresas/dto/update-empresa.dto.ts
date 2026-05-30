import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateEmpresaDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  codigoEmpresaSenior?: string;
}
