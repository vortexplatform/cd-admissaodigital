import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
import { CreateCandidatoDependenteDto } from './create-candidato-dependente.dto';
import { CreateCandidatoEtapaDto } from './create-candidato-etapa.dto';
import { CreateCandidatoValeTransporteDto } from './create-candidato-vale-transporte.dto';

export class CreateCandidatoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cpf!: string;

  @IsDateString()
  dataNascimento!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  telefone?: string;

  @IsIn(['M', 'F'])
  genero!: string;

  @IsIn(['ATIVO_PROCESSO', 'ELIMINADO', 'DESISTENTE', 'ADMITIDO'])
  @IsOptional()
  situacao?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  justificativaReprovacao?: string;

  @IsBoolean()
  @IsOptional()
  possuiFilhos?: boolean;

  @IsInt()
  cidadeVagaId!: number;

  // Admissão
  @IsIn(['PRIMEIRO_EMPREGO', 'REEMPREGO'])
  tipoAdmissao!: string;

  // Dados pessoais adicionais
  @IsString()
  @IsNotEmpty()
  estadoCivil!: string;

  @IsString()
  @IsNotEmpty()
  grauInstrucao!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'PIS deve conter 11 dígitos' })
  @IsOptional()
  pis?: string;

  @IsInt()
  raccor!: number;

  // Naturalidade
  @IsInt()
  nacionalidade!: number;

  @IsString()
  @IsNotEmpty()
  paisNascimento!: string;

  @IsString()
  @IsNotEmpty()
  estadoNascimento!: string;

  @IsInt()
  cidadeNascimentoCod!: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cidadeNascimentoNome?: string;

  // Endereço
  @IsString()
  @IsNotEmpty()
  pais!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'CEP deve conter 8 dígitos' })
  cep!: string;

  @IsString()
  @IsNotEmpty()
  estadoEndereco!: string;

  @IsInt()
  cidadeCod!: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cidadeNome?: string;

  @IsInt()
  @IsOptional()
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

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  complemento?: string;

  // Contatos
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ddiTelefone?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  dddTelefone?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numeroTelefone?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  ddiTelefone2?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  dddTelefone2?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numeroTelefone2?: string;

  // RG
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numeroRg?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  orgaoEmissorRg?: string;

  @IsDateString()
  @IsOptional()
  dataExpedicaoRg?: string;

  // Título de eleitor
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numeroTituloEleitor?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  zonaTituloEleitor?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  secaoTituloEleitor?: string;

  // Reservista
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numeroCertReservista?: string;

  // Certidão civil
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tipoCertidaoCivil?: string;

  @IsDateString()
  @IsOptional()
  dataEmissaoCertidaoCivil?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  matriculaCertidaoCivil?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  termoMatriculaCertidao?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  livroCertidaoCivil?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  folhaCertidaoCivil?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  estadoCertidaoCivil?: string;

  @IsInt()
  @IsOptional()
  cidadeCertidaoCivilCod?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cidadeCertidaoCivilNome?: string;

  // Uniforme
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tamanhoCamisa?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tamanhoCalca?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tamanhoCalcado?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidatoDependenteDto)
  @IsOptional()
  dependentes?: CreateCandidatoDependenteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidatoValeTransporteDto)
  @IsOptional()
  valeTransportes?: CreateCandidatoValeTransporteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidatoEtapaDto)
  @IsOptional()
  etapas?: CreateCandidatoEtapaDto[];
}
