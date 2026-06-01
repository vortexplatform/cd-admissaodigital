import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModoSubstituicaoDocumento } from '@prisma/client';

export class DocumentoTemplateSubstituicaoDto {
  @Type(() => Number)
  @IsInt()
  substituidoTemplateId!: number;

  @IsEnum(ModoSubstituicaoDocumento)
  modo!: ModoSubstituicaoDocumento;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  campoOcr?: string;
}

export class UpsertDocumentoTemplateDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  descricao?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  palavrasChave?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mimeTypesPermitidos?: string[];

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  condicaoGenero?: string;

  @IsBoolean()
  @IsOptional()
  condicaoPossuiFilhos?: boolean | null;

  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  ordem?: number;

  @ValidateNested({ each: true })
  @Type(() => DocumentoTemplateSubstituicaoDto)
  @IsArray()
  @IsOptional()
  substituicoes?: DocumentoTemplateSubstituicaoDto[];
}
