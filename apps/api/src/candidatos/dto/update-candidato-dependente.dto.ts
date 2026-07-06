import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateCandidatoDependenteDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  codigoGrauParentesco?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  descricaoGrauParentesco?: string;

  @IsInt()
  @IsOptional()
  codigoTipoEsocial?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  descricaoTipoEsocial?: string;

  @IsIn(['MASCULINO', 'FEMININO'])
  @IsOptional()
  sexo?: string;

  @IsBoolean()
  @IsOptional()
  dependenteIr?: boolean;

  @IsDateString()
  @IsOptional()
  dataNascimento?: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  @IsOptional()
  cpf?: string;
}
