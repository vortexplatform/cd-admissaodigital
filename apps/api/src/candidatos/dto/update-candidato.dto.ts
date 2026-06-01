import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateCandidatoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  @IsOptional()
  cpf?: string;

  @IsDateString()
  @IsOptional()
  dataNascimento?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nome?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  telefone?: string;

  @IsIn(['M', 'F'])
  @IsOptional()
  genero?: string;

  @IsBoolean()
  @IsOptional()
  possuiFilhos?: boolean;
}
