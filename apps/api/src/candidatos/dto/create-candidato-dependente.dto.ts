import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';

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
  dataNascimento!: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf!: string;
}
