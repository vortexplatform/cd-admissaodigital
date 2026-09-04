import {
  IsBoolean,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PublicDadosVagaDto {
  @IsString()
  @IsNotEmpty()
  bairro!: string;

  @IsIn(['NAO', 'MANHA', 'TARDE', 'NOITE'])
  @IsOptional()
  estudoHorario?: string;

  @IsBoolean()
  @IsOptional()
  disponibilidadeHorario?: boolean;

  @IsString()
  @IsOptional()
  nomePai?: string;

  @IsString()
  @IsOptional()
  nomeMae?: string;

  @IsBoolean()
  @IsOptional()
  indicadoFuncionario?: boolean;

  @IsString()
  @IsOptional()
  indicadoLojaSetor?: string;

  @IsBoolean()
  @IsOptional()
  parenteEmpresa?: boolean;

  @IsString()
  @IsOptional()
  parenteNome?: string;

  @IsString()
  @IsOptional()
  parenteLojaSetor?: string;

  @IsBoolean()
  @IsOptional()
  aposentado?: boolean;

  @IsString()
  @IsOptional()
  aposentadoriaTipo?: string;

  @IsIn(['BICICLETA', 'MOTO', 'CARRO', 'NAO'])
  @IsOptional()
  conducaoPropria?: string;
}

export class PublicLojaProximaDto {
  @IsInt()
  codfil!: number;
}

export class PublicExperienciaDto {
  @IsString()
  @IsNotEmpty()
  empresa!: string;

  @IsString()
  @IsNotEmpty()
  cargo!: string;

  @IsDateString()
  @IsOptional()
  admissao?: string;

  @IsDateString()
  @IsOptional()
  demissao?: string;

  @IsString()
  @IsOptional()
  motivoSaida?: string;
}

export class PublicCandidatoDto {
  @IsArray()
  @IsString({ each: true })
  vagas!: string[];

  @IsBoolean()
  pcd!: boolean;

  @IsString()
  @IsNotEmpty()
  pretensaoSalarial!: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsDateString()
  dataNascimento!: string;

  @IsInt()
  cidadeVagaId!: number;

  @IsString()
  @IsNotEmpty()
  estadoCivil!: string;

  @IsInt()
  raccor!: number;

  @IsString()
  @IsNotEmpty()
  grauInstrucao!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @IsString()
  @Matches(/^\d{2}$/, { message: 'DDD deve conter 2 dígitos' })
  dddTelefone!: string;

  @IsString()
  @Matches(/^\d{9}$/, { message: 'Telefone deve conter 9 dígitos' })
  numeroTelefone!: string;

  @IsString()
  @IsNotEmpty()
  cep!: string;

  @IsString()
  @IsNotEmpty()
  estadoEndereco!: string;

  @IsOptional()
  @IsInt()
  cidadeCod?: number;

  @IsString()
  @IsNotEmpty()
  cidadeNome!: string;

  @IsOptional()
  @IsInt()
  bairroCod?: number;

  @IsString()
  @IsNotEmpty()
  bairroNome!: string;

  @IsString()
  @IsNotEmpty()
  tipoLogradouro!: string;

  @IsString()
  @IsNotEmpty()
  endereco!: string;

  @IsString()
  @IsNotEmpty()
  numero!: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @ValidateNested()
  @Type(() => PublicDadosVagaDto)
  dadosVaga!: PublicDadosVagaDto;

  @ValidateNested({ each: true })
  @Type(() => PublicLojaProximaDto)
  lojasProximas!: PublicLojaProximaDto[];

  @ValidateNested({ each: true })
  @Type(() => PublicExperienciaDto)
  experiencias!: PublicExperienciaDto[];
}

export class PublicCandidatoUpdateDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vagas?: string[];

  @IsBoolean()
  @IsOptional()
  pcd?: boolean;

  @IsString()
  @IsOptional()
  pretensaoSalarial?: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @IsString()
  @Matches(/^\d{2}$/, { message: 'DDD deve conter 2 dígitos' })
  dddTelefone!: string;

  @IsString()
  @Matches(/^\d{9}$/, { message: 'Telefone deve conter 9 dígitos' })
  numeroTelefone!: string;

  @IsBoolean()
  atualizarEndereco!: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cep?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  estadoEndereco?: string;

  @IsOptional()
  @IsInt()
  cidadeCod?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cidadeNome?: string;

  @IsOptional()
  @IsInt()
  bairroCod?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bairroNome?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipoLogradouro?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  endereco?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @ValidateNested()
  @Type(() => PublicDadosVagaDto)
  dadosVaga!: PublicDadosVagaDto;

  @ValidateNested({ each: true })
  @Type(() => PublicLojaProximaDto)
  lojasProximas!: PublicLojaProximaDto[];

  @ValidateNested({ each: true })
  @Type(() => PublicExperienciaDto)
  experiencias!: PublicExperienciaDto[];
}
