import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
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

  // Admissão
  @IsIn(['PRIMEIRO_EMPREGO', 'REEMPREGO'])
  @IsOptional()
  tipoAdmissao?: string;

  // Dados pessoais adicionais
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  estadoCivil?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  grauInstrucao?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  pis?: string;

  @IsInt()
  @IsOptional()
  raccor?: number;

  // Naturalidade
  @IsInt()
  @IsOptional()
  nacionalidade?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  paisNascimento?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  estadoNascimento?: string;

  @IsInt()
  @IsOptional()
  cidadeNascimentoCod?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cidadeNascimentoNome?: string;

  // Endereço
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  pais?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cep?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  estadoEndereco?: string;

  @IsInt()
  @IsOptional()
  cidadeCod?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cidadeNome?: string;

  @IsInt()
  @IsOptional()
  bairroCod?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  bairroNome?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tipoLogradouro?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  endereco?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numero?: string;

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
}
