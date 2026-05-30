import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusRequisicaoVaga, TipoRequisicaoVaga } from '@prisma/client';

export class CreateRequisicaoDto {
  @IsEnum(TipoRequisicaoVaga)
  @IsOptional()
  tipo?: TipoRequisicaoVaga;

  @IsEnum(StatusRequisicaoVaga)
  @IsOptional()
  status?: StatusRequisicaoVaga;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  empresaId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  candidatoId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  filial?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  filialNome?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cargo?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cargoNome?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  centroCusto?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ccustoNome?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  escala?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  descricaoEscala?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sindicato?: string;

  @IsDateString()
  @IsOptional()
  dataPrevistaAdmissao?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  motivoAbertura?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  observacao?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  codigoRequisicaoSenior?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  codigoCandidatoSenior?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  codigoColaboradorSenior?: string;
}
