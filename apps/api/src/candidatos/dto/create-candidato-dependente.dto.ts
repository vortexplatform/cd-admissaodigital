import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class CreateCandidatoDependenteDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  codigoGrauParentesco!: string;

  @IsString()
  @IsNotEmpty()
  descricaoGrauParentesco!: string;

  @IsInt()
  codigoTipoEsocial!: number;

  @IsString()
  @IsNotEmpty()
  descricaoTipoEsocial!: string;

  @IsIn(['MASCULINO', 'FEMININO'])
  sexo!: string;

  @IsBoolean()
  dependenteIr!: boolean;

  @IsDateString()
  @IsOptional()
  dataNascimento?: string;

  @ValidateIf((dependente: CreateCandidatoDependenteDto) => dependente.dependenteIr === true || (dependente.cpf !== undefined && dependente.cpf !== null && dependente.cpf !== ''))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf?: string;
}
