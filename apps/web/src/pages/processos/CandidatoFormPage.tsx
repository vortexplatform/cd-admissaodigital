import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, BriefcaseBusiness, Edit3, Save, UserRoundPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Control, Controller, FieldValues, Path, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import ReactSelect from 'react-select';
import type { StylesConfig } from 'react-select';
import AsyncSelect from 'react-select/async';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Tipos dos dados externos (Oracle)
// ---------------------------------------------------------------------------
interface Nacionalidade {
  CODNAC: number;
  DESNAC: string;
}
interface Pais {
  CODPAI: number;
  NOMPAI: string;
}
interface Estado {
  CODPAI: number;
  CODEST: string;
  DESEST: string;
}
interface Cidade {
  CODCID: number;
  NOMCID: string;
  CODPAI: number;
  CODEST: string;
}
interface CidadeVaga {
  id: number;
  nome: string;
}
interface Bairro {
  CODCID: number;
  CODBAI: number;
  NOMBAI: string;
}
interface OpcaoChave {
  KEYNAM: string;
  VALKEY: string;
}
interface TipoDependenteEsocial {
  codigo: number;
  descricao: string;
}
interface CandidatoDependenteData {
  id: number;
  draftId?: string;
  nome: string;
  codigoGrauParentesco: string;
  descricaoGrauParentesco: string;
  codigoTipoEsocial: number;
  descricaoTipoEsocial: string;
  sexo: 'MASCULINO' | 'FEMININO';
  dependenteIr: boolean;
  dataNascimento: string | null;
  cpf: string;
}
interface CandidatoValeTransporteData {
  id: number;
  draftId?: string;
  tipoTransporte: 'ONIBUS' | 'METRO' | 'TREM';
  tipoTrajeto: 'RESIDENCIA_TRABALHO' | 'TRABALHO_RESIDENCIA';
  transporteUsado: string;
  preco: string | number;
}
interface EtapaSenior {
  CODETA: number;
  DESETA: string;
}
interface CandidatoEtapaData {
  id: number;
  draftId?: string;
  codigoEtapa: number;
  descricaoEtapa: string;
  data: string | null;
  sequencia: number;
  observacao: string | null;
}

// ---------------------------------------------------------------------------
// Dados estáticos
// ---------------------------------------------------------------------------
const GRAUS_INSTRUCAO = [
  { cod: '01', desc: 'Analfabeto' },
  { cod: '02', desc: '1ª a 4ª Série' },
  { cod: '03', desc: '4ª Série Completa' },
  { cod: '04', desc: 'Ensino Fundamental Incompleto' },
  { cod: '05', desc: 'Ensino Fundamental Completo' },
  { cod: '06', desc: 'Ensino Médio Incompleto' },
  { cod: '07', desc: 'Ensino Médio Completo' },
  { cod: '08', desc: 'Superior Incompleto' },
  { cod: '09', desc: 'Superior Completo' },
  { cod: '10', desc: 'Pós-Graduação' },
  { cod: '11', desc: 'Mestrado' },
  { cod: '12', desc: 'Doutorado' },
  { cod: '13', desc: 'Ph.D.' },
];

// ---------------------------------------------------------------------------
// Lista de status editáveis de candidatura
// ---------------------------------------------------------------------------
const statusCandidaturaList = [
  'INSCRITO',
  'EM_ANALISE',
  'ENTREVISTA',
  'APROVADO',
  'EFETIVADO',
  'REPROVADO',
  'DESISTIU',
  'CANCELADO',
] as const;

// ---------------------------------------------------------------------------
// Labels de status
// ---------------------------------------------------------------------------
const statusLabels: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ABERTA: 'Aberta',
  AGUARDANDO_CANDIDATO: 'Aguardando candidato',
  EM_ADMISSAO: 'Em admissão',
  AGUARDANDO_DOCUMENTOS: 'Aguardando documentos',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  AGUARDANDO_RH: 'Aguardando RH',
  PENDENTE_CORRECAO: 'Pendente correção',
  APROVADA: 'Aprovada',
  INTEGRANDO_SENIOR: 'Integrando Senior',
  INTEGRADA_SENIOR: 'Integrada Senior',
  CANCELADA: 'Cancelada',
  REPROVADA: 'Reprovada',
  ERRO_INTEGRACAO: 'Erro integração',
  INSCRITO: 'Inscrito',
  EM_ANALISE: 'Em análise',
  ENTREVISTA: 'Entrevista',
  APROVADO: 'Aprovado',
  EFETIVADO: 'Efetivado',
  REPROVADO: 'Reprovado',
  DESISTIU: 'Desistiu',
  CANCELADO: 'Cancelado',
};

// ---------------------------------------------------------------------------
// Tipos locais do formulário
// ---------------------------------------------------------------------------
interface Empresa {
  id: number;
  nome: string;
}
interface RequisicaoResumo {
  id: number;
  empresa: Empresa | null;
  dataPrevistaAdmissao: string | null;
  postoTrabalhoNome: string | null;
  escala: string | null;
  descricaoEscala: string | null;
  createdAt: string;
}
interface CandidaturaResumo {
  id: number;
  status: string;
  matricula: string | null;
  admissao: string | null;
  requisicao: RequisicaoResumo;
  createdAt: string;
}
interface RequisicaoDisponivel {
  id: number;
  quantidadeVagas: number;
  vagasDisponiveis: number;
  empresa: Empresa | null;
  filialNome: string | null;
  postoTrabalho: string | null;
  postoTrabalhoNome: string | null;
  cargo: string | null;
  cargoNome: string | null;
  ccustoNome: string | null;
  escala: string | null;
  descricaoEscala: string | null;
  dataPrevistaAdmissao: string | null;
}

interface RequisicaoSelectOption {
  value: string;
  label: string;
}

interface RequisicaoOption extends RequisicaoSelectOption {
  requisicao: RequisicaoDisponivel;
}

interface CandidatoData {
  id: number;
  cpf: string;
  dataNascimento: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  genero: string | null;
  situacao: string;
  justificativaReprovacao: string | null;
  possuiFilhos: boolean;
  cidadeVagaId: number;
  tipoAdmissao: string | null;
  estadoCivil: string | null;
  grauInstrucao: string | null;
  pis: string | null;
  nacionalidade: number | null;
  paisNascimento: string | null;
  estadoNascimento: string | null;
  cidadeNascimentoCod: number | null;
  cidadeNascimentoNome: string | null;
  pais: string | null;
  cep: string | null;
  estadoEndereco: string | null;
  cidadeCod: number | null;
  cidadeNome: string | null;
  bairroCod: number | null;
  bairroNome: string | null;
  tipoLogradouro: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  ddiTelefone: string | null;
  dddTelefone: string | null;
  numeroTelefone: string | null;
  ddiTelefone2: string | null;
  dddTelefone2: string | null;
  numeroTelefone2: string | null;
  numeroRg: string | null;
  orgaoEmissorRg: string | null;
  dataExpedicaoRg: string | null;
  numeroTituloEleitor: string | null;
  zonaTituloEleitor: string | null;
  secaoTituloEleitor: string | null;
  numeroCertReservista: string | null;
  tipoCertidaoCivil: string | null;
  dataEmissaoCertidaoCivil: string | null;
  matriculaCertidaoCivil: string | null;
  termoMatriculaCertidao: string | null;
  livroCertidaoCivil: string | null;
  folhaCertidaoCivil: string | null;
  estadoCertidaoCivil: string | null;
  cidadeCertidaoCivilCod: number | null;
  cidadeCertidaoCivilNome: string | null;
  raccor: number | null;
  tamanhoCamisa: string | null;
  tamanhoCalca: string | null;
  tamanhoCalcado: string | null;
  candidaturas: CandidaturaResumo[];
  dependentes: CandidatoDependenteData[];
  valeTransportes: CandidatoValeTransporteData[];
  etapas: CandidatoEtapaData[];
}

type CandidatoResponse = Omit<
  CandidatoData,
  'candidaturas' | 'dependentes' | 'valeTransportes' | 'etapas'
> & {
  candidaturas?: CandidaturaResumo[] | null;
  dependentes?: CandidatoDependenteData[] | null;
  valeTransportes?: CandidatoValeTransporteData[] | null;
  etapas?: CandidatoEtapaData[] | null;
};

const normalizeCandidato = (data: CandidatoResponse): CandidatoData => ({
  ...data,
  candidaturas: data.candidaturas ?? [],
  dependentes: data.dependentes ?? [],
  valeTransportes: data.valeTransportes ?? [],
  etapas: data.etapas ?? [],
});

// ---------------------------------------------------------------------------
// Schema Zod
// ---------------------------------------------------------------------------
const candidatoSchema = z
  .object({
  cpf: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length === 11, 'Informe um CPF com 11 dígitos'),
  dataNascimento: z.string().trim().min(1, 'Informe a data de nascimento'),
  nome: z.string().trim().min(1, 'Informe o nome'),
  email: z.string().trim().email('Informe um e-mail válido').optional().or(z.literal('')),
  telefone: z.string().trim().optional(),
  genero: z.enum(['', 'M', 'F']).refine((value) => value !== '', 'Informe o gênero'),
  situacao: z.enum(['ATIVO_PROCESSO', 'ELIMINADO', 'DESISTENTE', 'ADMITIDO']),
  justificativaReprovacao: z.string().trim().optional(),
  cidadeVagaId: z.string().trim().min(1, 'Informe a cidade da vaga'),

  // Admissão
  tipoAdmissao: z
    .enum(['', 'PRIMEIRO_EMPREGO', 'REEMPREGO'])
    .refine((value) => value !== '', 'Informe o tipo de admissão'),

  // Dados pessoais adicionais
  estadoCivil: z.string().trim().min(1, 'Informe o estado civil'),
  grauInstrucao: z.string().trim().min(1, 'Informe o grau de instrução'),
  pis: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.replace(/\D/g, '').length === 11, 'Informe um PIS com 11 dígitos'),
  raccor: z.string().trim().min(1, 'Informe a raça'),

  // Naturalidade
  nacionalidade: z.string().trim().min(1, 'Informe a nacionalidade'),
  paisNascimento: z.string().trim().min(1, 'Informe o país de nascimento'),
  estadoNascimento: z.string().trim().min(1, 'Informe o estado de nascimento'),
  cidadeNascimentoCod: z.string().trim().min(1, 'Informe a cidade de nascimento'),
  cidadeNascimentoNome: z.string().trim().optional(),

  // Endereço
  pais: z.string().trim().min(1, 'Informe o país do endereço'),
  cep: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length === 8, 'Informe um CEP com 8 dígitos'),
  estadoEndereco: z.string().trim().min(1, 'Informe o estado do endereço'),
  cidadeCod: z.string().trim().min(1, 'Informe a cidade do endereço'),
  cidadeNome: z.string().trim().optional(),
  bairroCod: z.string().trim().optional(),
  bairroNome: z.string().trim().min(1, 'Informe o bairro'),
  tipoLogradouro: z.string().trim().min(1, 'Informe o tipo de logradouro'),
  endereco: z.string().trim().min(1, 'Informe o logradouro'),
  numero: z.string().trim().min(1, 'Informe o número'),
  complemento: z.string().trim().optional(),

  // Contatos
  ddiTelefone: z.string().trim().optional(),
  dddTelefone: z.string().trim().optional(),
  numeroTelefone: z.string().trim().optional(),
  ddiTelefone2: z.string().trim().optional(),
  dddTelefone2: z.string().trim().optional(),
  numeroTelefone2: z.string().trim().optional(),

  // RG
  numeroRg: z.string().trim().optional(),
  orgaoEmissorRg: z.string().trim().optional(),
  dataExpedicaoRg: z.string().trim().optional(),

  // Título de eleitor
  numeroTituloEleitor: z.string().trim().optional(),
  zonaTituloEleitor: z.string().trim().optional(),
  secaoTituloEleitor: z.string().trim().optional(),

  // Reservista
  numeroCertReservista: z.string().trim().optional(),

  // Certidão civil
  tipoCertidaoCivil: z.string().trim().optional(),
  dataEmissaoCertidaoCivil: z.string().trim().optional(),
  matriculaCertidaoCivil: z.string().trim().optional(),
  termoMatriculaCertidao: z.string().trim().optional(),
  livroCertidaoCivil: z.string().trim().optional(),
  folhaCertidaoCivil: z.string().trim().optional(),
  estadoCertidaoCivil: z.string().trim().optional(),
  cidadeCertidaoCivilCod: z.string().trim().optional(),
  cidadeCertidaoCivilNome: z.string().trim().optional(),

  // Uniforme
  tamanhoCamisa: z.string().trim().optional(),
  tamanhoCalca: z.string().trim().optional(),
  tamanhoCalcado: z.string().trim().optional(),
}).superRefine((values, ctx) => {
  if (
    (values.situacao === 'ELIMINADO' || values.situacao === 'DESISTENTE') &&
    !values.justificativaReprovacao?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['justificativaReprovacao'],
      message: 'Informe a justificativa',
    });
  }
});

const dependenteSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome'),
    codigoGrauParentesco: z.string().trim().min(1, 'Informe o grau de parentesco'),
    descricaoGrauParentesco: z.string().trim().optional(),
    codigoTipoEsocial: z.string().trim().min(1, 'Informe o tipo eSocial'),
    descricaoTipoEsocial: z.string().trim().optional(),
    sexo: z.enum(['', 'MASCULINO', 'FEMININO']).refine((value) => value !== '', 'Informe o sexo'),
    dependenteIr: z.boolean().optional(),
    dataNascimento: z.string().trim().optional(),
    cpf: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    const cpfDigits = values.cpf?.replace(/\D/g, '') ?? '';
    if (!values.dependenteIr && cpfDigits.length === 0) return;
    if (cpfDigits.length === 11) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cpf'],
      message: values.dependenteIr ? 'Informe o CPF do dependente IR' : 'Informe um CPF com 11 dígitos',
    });
  });

const valeTransporteSchema = z.object({
  tipoTransporte: z
    .enum(['', 'ONIBUS', 'METRO', 'TREM'])
    .refine((value) => value !== '', 'Informe o tipo de transporte'),
  tipoTrajeto: z
    .enum(['', 'RESIDENCIA_TRABALHO', 'TRABALHO_RESIDENCIA'])
    .refine((value) => value !== '', 'Informe o tipo de trajeto'),
  transporteUsado: z.string().trim().min(1, 'Informe o transporte usado'),
  preco: z.string().trim().min(1, 'Informe o preço'),
});

const etapaSchema = z.object({
  codigoEtapa: z.string().trim().min(1, 'Selecione a etapa'),
  data: z.string().trim().optional(),
  observacao: z.string().trim().optional(),
});

type CandidatoForm = z.input<typeof candidatoSchema>;
type DependenteForm = z.input<typeof dependenteSchema>;
type DependentePayload = Omit<CandidatoDependenteData, 'id' | 'draftId'>;
type ValeTransporteForm = z.input<typeof valeTransporteSchema>;
type ValeTransportePayload = Omit<CandidatoValeTransporteData, 'id' | 'draftId'>;
type EtapaForm = z.input<typeof etapaSchema>;
type EtapaPayload = Omit<CandidatoEtapaData, 'id' | 'draftId'>;
type CandidatoMode = 'create' | 'edit' | 'view';

const dependenteDefaultValues: DependenteForm = {
  nome: '',
  codigoGrauParentesco: '',
  descricaoGrauParentesco: '',
  codigoTipoEsocial: '',
  descricaoTipoEsocial: '',
  sexo: '',
  dependenteIr: false,
  dataNascimento: '',
  cpf: '',
};

const valeTransporteDefaultValues: ValeTransporteForm = {
  tipoTransporte: '',
  tipoTrajeto: '',
  transporteUsado: '',
  preco: '',
};

const etapaDefaultValues: EtapaForm = {
  codigoEtapa: '',
  data: '',
  observacao: '',
};

const selectStyles: StylesConfig<RequisicaoSelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
    borderRadius: 'calc(var(--radius) - 2px)',
    backgroundColor: 'hsl(var(--background))',
    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
    ':hover': { borderColor: 'hsl(var(--ring))' },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 60,
    overflow: 'hidden',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--muted))'
        : 'transparent',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
  }),
  placeholder: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
  input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
};

const formatRequisicaoOption = (requisicao: RequisicaoDisponivel): RequisicaoOption => ({
  value: String(requisicao.id),
  label: [
    `#${requisicao.id} - ${requisicao.postoTrabalho ?? 'Posto não informado'} - ${requisicao.postoTrabalhoNome ?? requisicao.cargoNome ?? requisicao.cargo ?? 'Descrição não informada'}`,
    requisicao.descricaoEscala,
  ]
    .filter(Boolean)
    .join(' · '),
  requisicao,
});

const defaultValues: CandidatoForm = {
  cpf: '',
  dataNascimento: '',
  nome: '',
  email: '',
  telefone: '',
  genero: '',
  situacao: 'ATIVO_PROCESSO',
  justificativaReprovacao: '',
  cidadeVagaId: '',
  tipoAdmissao: '',
  estadoCivil: '',
  grauInstrucao: '',
  pis: '',
  raccor: '',
  nacionalidade: '',
  paisNascimento: '',
  estadoNascimento: '',
  cidadeNascimentoCod: '',
  cidadeNascimentoNome: '',
  pais: '',
  cep: '',
  estadoEndereco: '',
  cidadeCod: '',
  cidadeNome: '',
  bairroCod: '',
  bairroNome: '',
  tipoLogradouro: '',
  endereco: '',
  numero: '',
  complemento: '',
  ddiTelefone: '',
  dddTelefone: '',
  numeroTelefone: '',
  ddiTelefone2: '',
  dddTelefone2: '',
  numeroTelefone2: '',
  numeroRg: '',
  orgaoEmissorRg: '',
  dataExpedicaoRg: '',
  numeroTituloEleitor: '',
  zonaTituloEleitor: '',
  secaoTituloEleitor: '',
  numeroCertReservista: '',
  tipoCertidaoCivil: '',
  dataEmissaoCertidaoCivil: '',
  matriculaCertidaoCivil: '',
  termoMatriculaCertidao: '',
  livroCertidaoCivil: '',
  folhaCertidaoCivil: '',
  estadoCertidaoCivil: '',
  cidadeCertidaoCivilCod: '',
  cidadeCertidaoCivilNome: '',
  tamanhoCamisa: '',
  tamanhoCalca: '',
  tamanhoCalcado: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toDateInputValue = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');
const toText = (value: string | null | undefined) => value ?? '';
const optionalString = (value?: string) => value?.trim() || undefined;
const optionalDigits = (value?: string) => value?.replace(/\D/g, '') || undefined;

const isWithin7Days = (dateStr: string | null | undefined) => {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.abs(diff) <= 7 * 24 * 60 * 60 * 1000;
};
const optionalInt = (value?: string) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
};

const buildDependentePayload = (values: DependenteForm): DependentePayload => ({
  nome: values.nome.trim(),
  codigoGrauParentesco: values.codigoGrauParentesco,
  descricaoGrauParentesco: values.descricaoGrauParentesco?.trim() || '',
  codigoTipoEsocial: parseInt(values.codigoTipoEsocial, 10),
  descricaoTipoEsocial: values.descricaoTipoEsocial?.trim() || '',
  sexo: values.sexo as DependentePayload['sexo'],
  dependenteIr: Boolean(values.dependenteIr),
  dataNascimento: values.dataNascimento || null,
  cpf: values.dependenteIr ? values.cpf?.replace(/\D/g, '') ?? '' : '',
});

const buildPayloadDependentes = (dependentes?: CandidatoDependenteData[]) =>
  dependentes?.map((dependente) => ({
    nome: dependente.nome,
    codigoGrauParentesco: dependente.codigoGrauParentesco,
    descricaoGrauParentesco: dependente.descricaoGrauParentesco,
    codigoTipoEsocial: dependente.codigoTipoEsocial,
    descricaoTipoEsocial: dependente.descricaoTipoEsocial,
    sexo: dependente.sexo,
    dependenteIr: dependente.dependenteIr,
    dataNascimento: dependente.dataNascimento,
    cpf: dependente.cpf,
  }));

const parseMoney = (value: string | number) => Number(String(value).replace(',', '.'));

const buildValeTransportePayload = (values: ValeTransporteForm): ValeTransportePayload => ({
  tipoTransporte: values.tipoTransporte as ValeTransportePayload['tipoTransporte'],
  tipoTrajeto: values.tipoTrajeto as ValeTransportePayload['tipoTrajeto'],
  transporteUsado: values.transporteUsado.trim(),
  preco: parseMoney(values.preco),
});

const buildPayloadValeTransportes = (valeTransportes?: CandidatoValeTransporteData[]) =>
  valeTransportes?.map((valeTransporte) => ({
    tipoTransporte: valeTransporte.tipoTransporte,
    tipoTrajeto: valeTransporte.tipoTrajeto,
    transporteUsado: valeTransporte.transporteUsado,
    preco: parseMoney(valeTransporte.preco),
  }));

const buildEtapaPayload = (
  values: EtapaForm,
  etapasSenior: EtapaSenior[],
  sequencia: number,
): EtapaPayload => {
  const codigoEtapa = parseInt(values.codigoEtapa, 10);
  const etapaSenior = etapasSenior.find((etapa) => etapa.CODETA === codigoEtapa);

  return {
    codigoEtapa,
    descricaoEtapa: etapaSenior?.DESETA ?? '',
    data: values.data || null,
    sequencia,
    observacao: values.observacao?.trim() || null,
  };
};

const buildPayloadEtapas = (etapas?: CandidatoEtapaData[]) =>
  etapas?.map((etapa) => ({
    codigoEtapa: etapa.codigoEtapa,
    descricaoEtapa: etapa.descricaoEtapa,
    data: etapa.data,
    sequencia: etapa.sequencia,
    observacao: etapa.observacao,
  }));

const buildPayload = (
  values: CandidatoForm,
  dependentes?: CandidatoDependenteData[],
  valeTransportes?: CandidatoValeTransporteData[],
  etapas?: CandidatoEtapaData[],
) => ({
  cpf: values.cpf.replace(/\D/g, ''),
  dataNascimento: values.dataNascimento,
  nome: optionalString(values.nome),
  email: optionalString(values.email),
  telefone: optionalString(values.telefone),
  genero: optionalString(values.genero),
  situacao: values.situacao,
  justificativaReprovacao: optionalString(values.justificativaReprovacao),
  cidadeVagaId: optionalInt(values.cidadeVagaId),
  tipoAdmissao: optionalString(values.tipoAdmissao),
  estadoCivil: optionalString(values.estadoCivil),
  grauInstrucao: optionalString(values.grauInstrucao),
  pis: optionalDigits(values.pis),
  raccor: values.raccor ? parseInt(values.raccor) : undefined,
  nacionalidade: optionalInt(values.nacionalidade),
  paisNascimento: optionalString(values.paisNascimento),
  estadoNascimento: optionalString(values.estadoNascimento),
  cidadeNascimentoCod: optionalInt(values.cidadeNascimentoCod),
  cidadeNascimentoNome: optionalString(values.cidadeNascimentoNome),
  pais: optionalString(values.pais),
  cep: optionalDigits(values.cep),
  estadoEndereco: optionalString(values.estadoEndereco),
  cidadeCod: optionalInt(values.cidadeCod),
  cidadeNome: optionalString(values.cidadeNome),
  bairroCod: optionalInt(values.bairroCod),
  bairroNome: optionalString(values.bairroNome),
  tipoLogradouro: optionalString(values.tipoLogradouro),
  endereco: optionalString(values.endereco),
  numero: optionalString(values.numero),
  complemento: optionalString(values.complemento),
  ddiTelefone: optionalString(values.ddiTelefone),
  dddTelefone: optionalString(values.dddTelefone),
  numeroTelefone: optionalString(values.numeroTelefone),
  ddiTelefone2: optionalString(values.ddiTelefone2),
  dddTelefone2: optionalString(values.dddTelefone2),
  numeroTelefone2: optionalString(values.numeroTelefone2),
  numeroRg: optionalString(values.numeroRg),
  orgaoEmissorRg: optionalString(values.orgaoEmissorRg),
  dataExpedicaoRg: optionalString(values.dataExpedicaoRg),
  numeroTituloEleitor: optionalString(values.numeroTituloEleitor),
  zonaTituloEleitor: optionalString(values.zonaTituloEleitor),
  secaoTituloEleitor: optionalString(values.secaoTituloEleitor),
  numeroCertReservista: optionalString(values.numeroCertReservista),
  tipoCertidaoCivil: optionalString(values.tipoCertidaoCivil),
  dataEmissaoCertidaoCivil: optionalString(values.dataEmissaoCertidaoCivil),
  matriculaCertidaoCivil: optionalString(values.matriculaCertidaoCivil),
  termoMatriculaCertidao: optionalString(values.termoMatriculaCertidao),
  livroCertidaoCivil: optionalString(values.livroCertidaoCivil),
  folhaCertidaoCivil: optionalString(values.folhaCertidaoCivil),
  estadoCertidaoCivil: optionalString(values.estadoCertidaoCivil),
  cidadeCertidaoCivilCod: optionalInt(values.cidadeCertidaoCivilCod),
  cidadeCertidaoCivilNome: optionalString(values.cidadeCertidaoCivilNome),
  tamanhoCamisa: optionalString(values.tamanhoCamisa),
  tamanhoCalca: optionalString(values.tamanhoCalca),
  tamanhoCalcado: optionalString(values.tamanhoCalcado),
  dependentes: buildPayloadDependentes(dependentes),
  valeTransportes: buildPayloadValeTransportes(valeTransportes),
  etapas: buildPayloadEtapas(etapas),
});

const getPageTitle = (mode: CandidatoMode) => {
  if (mode === 'create') return 'Novo candidato';
  if (mode === 'edit') return 'Editar candidato';
  return 'Visualizar candidato';
};

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
};

const formatPis = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{5})(\d{2})(\d{0,1})/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));
};

// ---------------------------------------------------------------------------
// Helpers para react-select
// ---------------------------------------------------------------------------
type SelectOption = { value: string; label: string };

const paisesToOptions = (list: Pais[]): SelectOption[] =>
  list.map((p) => ({ value: String(p.CODPAI), label: p.NOMPAI }));

const estadosToOptions = (list: Estado[]): SelectOption[] =>
  list.map((e) => ({ value: e.CODEST, label: `${e.CODEST} - ${e.DESEST}` }));

const cidadesToOptions = (list: Cidade[]): SelectOption[] =>
  list.map((c) => ({ value: String(c.CODCID), label: c.NOMCID }));

const bairrosToOptions = (list: Bairro[]): SelectOption[] =>
  list.map((b) => ({ value: String(b.CODBAI), label: b.NOMBAI }));

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------
function SelectField({
  id,
  label,
  disabled,
  children,
  error,
  required,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <select
        id={id}
        disabled={disabled}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function TextField({
  id,
  label,
  disabled,
  error,
  required,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input id={id} disabled={disabled} {...rest} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function TextareaField({
  id,
  label,
  disabled,
  error,
  required,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <textarea
        id={id}
        disabled={disabled}
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
        {...rest}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function MaskedTextField<TForm extends FieldValues>({
  id,
  label,
  control,
  name,
  mask,
  disabled,
  error,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  control: Control<TForm, unknown, TForm>;
  name: Path<TForm>;
  mask: (value: string) => string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            id={id}
            disabled={disabled}
            placeholder={placeholder}
            value={(field.value as string) ?? ''}
            onChange={(event) => field.onChange(mask(event.target.value))}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ReactSelectField<TForm extends FieldValues>({
  id,
  label,
  control,
  name,
  options,
  isDisabled,
  error,
  required,
  placeholder = 'Selecione...',
  onChange: onChangeProp,
  isLoading,
}: {
  id: string;
  label: string;
  control: Control<TForm, unknown, TForm>;
  name: Path<TForm>;
  options: SelectOption[];
  isDisabled?: boolean;
  error?: string;
  required?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <ReactSelect
            inputId={id}
            options={options}
            value={options.find((o) => o.value === (field.value as string)) ?? null}
            onChange={(opt) => {
              field.onChange(opt?.value ?? '');
              onChangeProp?.(opt?.value ?? '');
            }}
            isDisabled={isDisabled}
            isLoading={isLoading}
            placeholder={placeholder}
            noOptionsMessage={() => 'Nenhuma opção'}
            loadingMessage={() => 'Carregando...'}
            isClearable
            styles={{
              singleValue: () => ({ color: 'inherit' }),
              input: () => ({ color: 'inherit' }),
              option: () => ({ color: 'inherit', backgroundColor: 'transparent' }),
            }}
            classNames={{
              control: (s) =>
                cn(
                  '!min-h-9 h-9 text-sm !border !rounded-md !bg-background !text-foreground !shadow-none',
                  s.isFocused && '!border-ring !ring-1 !ring-ring',
                  s.isDisabled && '!opacity-50 !cursor-not-allowed',
                ),
              valueContainer: () => '!py-0 !px-3',
              input: () => '!m-0 !p-0 !text-sm',
              singleValue: () => '!text-sm',
              placeholder: () => '!text-sm !text-muted-foreground',
              indicatorsContainer: () => '!h-9',
              indicatorSeparator: () => '!hidden',
              dropdownIndicator: () => '!text-muted-foreground !px-2',
              clearIndicator: () => '!text-muted-foreground',
              menu: () =>
                '!bg-background !text-foreground !border !rounded-md !shadow-md !mt-1 !z-50',
              option: (s) =>
                cn(
                  '!px-3 !py-2 !text-sm !cursor-pointer',
                  s.isFocused && '!bg-accent !text-accent-foreground',
                  s.isSelected && '!bg-primary !text-primary-foreground',
                ),
              noOptionsMessage: () => '!px-3 !py-2 !text-sm !text-muted-foreground',
              loadingMessage: () => '!px-3 !py-2 !text-sm !text-muted-foreground',
            }}
          />
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function CandidatoFormPage({ mode }: { mode: CandidatoMode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [candidato, setCandidato] = useState<CandidatoData | null>(null);
  const [isLoading, setIsLoading] = useState(mode !== 'create');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedRequisicao, setSelectedRequisicao] = useState<RequisicaoOption | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkModalError, setLinkModalError] = useState('');
  const requisicaoSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isViewMode = mode === 'view';

  // Modal de admissão — null = fechado; number = id da candidatura alvo
  const [admissaoCandidaturaId, setAdmissaoCandidaturaId] = useState<number | null>(null);
  const [admissaoData, setAdmissaoData] = useState('');
  const [isGerandoAdmissao, setIsGerandoAdmissao] = useState(false);
  const [admissaoError, setAdmissaoError] = useState('');
  const [admissaoSuccess, setAdmissaoSuccess] = useState(false);

  // Matrícula ativa por candidatura: undefined=não checado, null=sem matrícula ativa, number=tem matrícula
  const [matriculaAtiva, setMatriculaAtiva] = useState<Record<number, number | null | undefined>>({});
  // Cancelamento de efetivação
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<Record<number, string>>({});

  // Edição de status de candidatura
  const [statusEdit, setStatusEdit] = useState<Record<number, string>>({});
  const [isSavingStatus, setIsSavingStatus] = useState<Record<number, boolean>>({});
  const [statusSaveError, setStatusSaveError] = useState<Record<number, string>>({});

  // Dados externos estáticos (carregados uma vez)
  const [nacionalidades, setNacionalidades] = useState<Nacionalidade[]>([]);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [tiposLogradouro, setTiposLogradouro] = useState<OpcaoChave[]>([]);
  const [estadosCivis, setEstadosCivis] = useState<OpcaoChave[]>([]);
  const [tiposCertidao, setTiposCertidao] = useState<OpcaoChave[]>([]);
  const [etnia, setEtnia] = useState<{ CODETN: number; DESETN: string }[]>([]);
  const [tiposGrauParentesco, setTiposGrauParentesco] = useState<OpcaoChave[]>([]);
  const [tiposDependenteEsocial, setTiposDependenteEsocial] = useState<TipoDependenteEsocial[]>([]);
  const [dependentesDraft, setDependentesDraft] = useState<CandidatoDependenteData[]>([]);
  const [dependenteModalOpen, setDependenteModalOpen] = useState(false);
  const [dependenteEditando, setDependenteEditando] = useState<CandidatoDependenteData | null>(null);
  const [isSavingDependente, setIsSavingDependente] = useState(false);
  const [dependenteError, setDependenteError] = useState('');
  const [valeTransportesDraft, setValeTransportesDraft] = useState<CandidatoValeTransporteData[]>([]);
  const [valeTransporteModalOpen, setValeTransporteModalOpen] = useState(false);
  const [valeTransporteEditando, setValeTransporteEditando] = useState<CandidatoValeTransporteData | null>(null);
  const [isSavingValeTransporte, setIsSavingValeTransporte] = useState(false);
  const [valeTransporteError, setValeTransporteError] = useState('');
  const [etapasSenior, setEtapasSenior] = useState<EtapaSenior[]>([]);
  const [etapasDraft, setEtapasDraft] = useState<CandidatoEtapaData[]>([]);
  const [etapaModalOpen, setEtapaModalOpen] = useState(false);
  const [etapaEditando, setEtapaEditando] = useState<CandidatoEtapaData | null>(null);
  const [isSavingEtapa, setIsSavingEtapa] = useState(false);
  const [etapaError, setEtapaError] = useState('');

  // Cascata: Naturalidade
  const [estadosNasc, setEstadosNasc] = useState<Estado[]>([]);
  const [cidadesNasc, setCidadesNasc] = useState<Cidade[]>([]);

  // Cascata: Endereço
  const [estadosEnd, setEstadosEnd] = useState<Estado[]>([]);
  const [cidadesEnd, setCidadesEnd] = useState<Cidade[]>([]);
  const [bairrosEnd, setBairrosEnd] = useState<Bairro[]>([]);

  // Cascata: Certidão civil (estado via ESTADOS_BR, cidades carregadas da API)
  const [estadosCert, setEstadosCert] = useState<Estado[]>([]);
  const [cidadesCert, setCidadesCert] = useState<Cidade[]>([]);
  const [cidadesVaga, setCidadesVaga] = useState<CidadeVaga[]>([]);

  useEffect(() => {
    api.get<CidadeVaga[]>('/cidades-vaga').then(({ data }) => setCidadesVaga(data)).catch(() => setCidadesVaga([]));
  }, []);

  useEffect(
    () => () => {
      if (requisicaoSearchTimeout.current) clearTimeout(requisicaoSearchTimeout.current);
    },
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CandidatoForm>({ resolver: zodResolver(candidatoSchema), defaultValues });

  const {
    register: registerDependente,
    handleSubmit: handleSubmitDependente,
    reset: resetDependente,
    watch: watchDependente,
    setValue: setDependenteValue,
    control: dependenteControl,
    formState: { errors: dependenteErrors },
  } = useForm<DependenteForm>({
    resolver: zodResolver(dependenteSchema),
    defaultValues: dependenteDefaultValues,
  });

  const {
    register: registerValeTransporte,
    handleSubmit: handleSubmitValeTransporte,
    reset: resetValeTransporte,
    formState: { errors: valeTransporteErrors },
  } = useForm<ValeTransporteForm>({
    resolver: zodResolver(valeTransporteSchema),
    defaultValues: valeTransporteDefaultValues,
  });

  const {
    register: registerEtapa,
    handleSubmit: handleSubmitEtapa,
    reset: resetEtapa,
    formState: { errors: etapaErrors },
  } = useForm<EtapaForm>({
    resolver: zodResolver(etapaSchema),
    defaultValues: etapaDefaultValues,
  });

  const situacaoSelecionada = watch('situacao');
  const exigeJustificativaReprovacao =
    situacaoSelecionada === 'ELIMINADO' || situacaoSelecionada === 'DESISTENTE';
  const dependenteIrSelecionado = watchDependente('dependenteIr');

  useEffect(() => {
    if (!exigeJustificativaReprovacao) setValue('justificativaReprovacao', '');
  }, [exigeJustificativaReprovacao, setValue]);

  useEffect(() => {
    if (!dependenteIrSelecionado) setDependenteValue('cpf', '');
  }, [dependenteIrSelecionado, setDependenteValue]);

  // Carregar dados estáticos ao montar
  useEffect(() => {
    Promise.all([
      api
        .get<Nacionalidade[]>('/general/nacionalidades')
        .then((r) => setNacionalidades(r.data))
        .catch(() => {}),
      api
        .get<Pais[]>('/general/paises')
        .then((r) => setPaises(r.data))
        .catch(() => {}),
      api
        .get<OpcaoChave[]>('/general/tipos-logradouro')
        .then((r) => setTiposLogradouro(r.data))
        .catch(() => {}),
      api
        .get<OpcaoChave[]>('/general/estados-civis')
        .then((r) => setEstadosCivis(r.data))
        .catch(() => {}),
      api
        .get<OpcaoChave[]>('/general/tipos-certidao-civil')
        .then((r) => setTiposCertidao(r.data))
        .catch(() => {}),
      api
        .get<{ CODETN: number; DESETN: string }[]>('/general/etnia')
        .then((r) => setEtnia(r.data))
        .catch(() => {}),
      api
        .get<OpcaoChave[]>('/general/tipos-grau-parentesco')
        .then((r) => setTiposGrauParentesco(r.data.sort((a, b) => Number(a.KEYNAM) - Number(b.KEYNAM))))
        .catch(() => {}),
      api
        .get<TipoDependenteEsocial[]>('/general/tipos-dependente-esocial')
        .then((r) => setTiposDependenteEsocial(r.data.sort((a, b) => a.codigo - b.codigo)))
        .catch(() => {}),
      api
        .get<EtapaSenior[]>('/general/etapas')
        .then((r) => setEtapasSenior(r.data))
        .catch(() => {}),
    ]);
  }, []);

  // Após carregar países, carregar estados do Brasil para seção de certidão
  useEffect(() => {
    if (paises.length === 0) return;
    const brasil = paises.find((p) => /^brasil$/i.test(p.NOMPAI.trim()));
    if (!brasil) return;
    api
      .get<Estado[]>(`/general/paises/${brasil.CODPAI}/estados`)
      .then((r) => setEstadosCert(r.data))
      .catch(() => {});
  }, [paises]);

  // ---------------------------------------------------------------------------
  // Handlers de cascata — Naturalidade
  // ---------------------------------------------------------------------------
  const handlePaisNascChange = (value: string) => {
    setValue('estadoNascimento', '');
    setValue('cidadeNascimentoCod', '');
    setValue('cidadeNascimentoNome', '');
    setEstadosNasc([]);
    setCidadesNasc([]);
    if (!value) return;
    api
      .get<Estado[]>(`/general/paises/${value}/estados`)
      .then((r) => setEstadosNasc(r.data))
      .catch(() => {});
  };

  const handleEstadoNascChange = (value: string) => {
    const paisNasc = watch('paisNascimento');
    setValue('cidadeNascimentoCod', '');
    setValue('cidadeNascimentoNome', '');
    setCidadesNasc([]);
    if (!value || !paisNasc) return;
    api
      .get<Cidade[]>(`/general/paises/${paisNasc}/estados/${value}/cidades`)
      .then((r) => setCidadesNasc(r.data))
      .catch(() => {});
  };

  const handleCidadeNascChange = (value: string) => {
    const cidade = cidadesNasc.find((c) => String(c.CODCID) === value);
    setValue('cidadeNascimentoNome', cidade?.NOMCID ?? '');
  };

  // ---------------------------------------------------------------------------
  // Handlers de cascata — Endereço
  // ---------------------------------------------------------------------------
  const handlePaisEndChange = (value: string) => {
    setValue('estadoEndereco', '');
    setValue('cidadeCod', '');
    setValue('cidadeNome', '');
    setValue('bairroCod', '');
    setValue('bairroNome', '');
    setEstadosEnd([]);
    setCidadesEnd([]);
    setBairrosEnd([]);
    if (!value) return;
    api
      .get<Estado[]>(`/general/paises/${value}/estados`)
      .then((r) => setEstadosEnd(r.data))
      .catch(() => {});
  };

  const handleEstadoEndChange = (value: string) => {
    const paisEnd = watch('pais');
    setValue('cidadeCod', '');
    setValue('cidadeNome', '');
    setValue('bairroCod', '');
    setValue('bairroNome', '');
    setCidadesEnd([]);
    setBairrosEnd([]);
    if (!value || !paisEnd) return;
    api
      .get<Cidade[]>(`/general/paises/${paisEnd}/estados/${value}/cidades`)
      .then((r) => setCidadesEnd(r.data))
      .catch(() => {});
  };

  const handleCidadeEndChange = (value: string) => {
    const cidade = cidadesEnd.find((c) => String(c.CODCID) === value);
    setValue('cidadeNome', cidade?.NOMCID ?? '');
    setValue('bairroCod', '');
    setValue('bairroNome', '');
    setBairrosEnd([]);
    if (!value) return;
    api
      .get<Bairro[]>(`/general/cidades/${value}/bairros`)
      .then((r) => setBairrosEnd(r.data))
      .catch(() => {});
  };

  const handleBairroEndChange = (value: string) => {
    const bairro = bairrosEnd.find((b) => String(b.CODBAI) === value);
    setValue('bairroNome', bairro?.NOMBAI ?? '');
  };

  // ---------------------------------------------------------------------------
  // Handlers de cascata — Certidão civil
  // ---------------------------------------------------------------------------
  const handleEstadoCertChange = (value: string) => {
    setValue('cidadeCertidaoCivilCod', '');
    setValue('cidadeCertidaoCivilNome', '');
    setCidadesCert([]);
    if (!value || estadosCert.length === 0) return;
    // Usar o CODPAI do Brasil (inferido da lista estadosCert)
    const codPaiBrasil = estadosCert[0]?.CODPAI;
    if (!codPaiBrasil) return;
    api
      .get<Cidade[]>(`/general/paises/${codPaiBrasil}/estados/${value}/cidades`)
      .then((r) => setCidadesCert(r.data))
      .catch(() => {});
  };

  const handleCidadeCertChange = (value: string) => {
    const cidade = cidadesCert.find((c) => String(c.CODCID) === value);
    setValue('cidadeCertidaoCivilNome', cidade?.NOMCID ?? '');
  };

  // ---------------------------------------------------------------------------
  // Carregar candidato existente (edit / view)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mode === 'create') return;

    api
      .get<CandidatoResponse>(`/candidatos/${id}`)
      .then(async ({ data }) => {
        const candidatoData = normalizeCandidato(data);
        setCandidato(candidatoData);

        // Inicializa status editável por candidatura
        const statusInit: Record<number, string> = {};
        candidatoData.candidaturas.forEach((c) => { statusInit[c.id] = c.status; });
        setStatusEdit(statusInit);

        // Pré-carregar dados de cascata com base nos valores existentes
        const preloads: Promise<void>[] = [];

        if (data.paisNascimento) {
          preloads.push(
            api
              .get<Estado[]>(`/general/paises/${data.paisNascimento}/estados`)
              .then((r) => setEstadosNasc(r.data))
              .catch(() => {}),
          );
          if (data.estadoNascimento) {
            preloads.push(
              api
                .get<Cidade[]>(
                  `/general/paises/${data.paisNascimento}/estados/${data.estadoNascimento}/cidades`,
                )
                .then((r) => setCidadesNasc(r.data))
                .catch(() => {}),
            );
          }
        }

        if (data.pais) {
          preloads.push(
            api
              .get<Estado[]>(`/general/paises/${data.pais}/estados`)
              .then((r) => setEstadosEnd(r.data))
              .catch(() => {}),
          );
          if (data.estadoEndereco) {
            preloads.push(
              api
                .get<Cidade[]>(
                  `/general/paises/${data.pais}/estados/${data.estadoEndereco}/cidades`,
                )
                .then((r) => setCidadesEnd(r.data))
                .catch(() => {}),
            );
          }
        }

        if (data.cidadeCod) {
          preloads.push(
            api
              .get<Bairro[]>(`/general/cidades/${data.cidadeCod}/bairros`)
              .then((r) => setBairrosEnd(r.data))
              .catch(() => {}),
          );
        }

        if (data.estadoCertidaoCivil && estadosCert.length > 0) {
          const codPaiBrasil = estadosCert[0]?.CODPAI;
          if (codPaiBrasil) {
            preloads.push(
              api
                .get<Cidade[]>(
                  `/general/paises/${codPaiBrasil}/estados/${data.estadoCertidaoCivil}/cidades`,
                )
                .then((r) => setCidadesCert(r.data))
                .catch(() => {}),
            );
          }
        }

        await Promise.all(preloads);

        reset({
          cpf: formatCpf(data.cpf),
          dataNascimento: toDateInputValue(data.dataNascimento),
          nome: toText(data.nome),
          email: toText(data.email),
          telefone: toText(data.telefone),
          genero: (data.genero as 'M' | 'F' | null) ?? '',
          situacao: (data.situacao ?? 'ATIVO_PROCESSO') as CandidatoForm['situacao'],
          justificativaReprovacao: toText(data.justificativaReprovacao),
          cidadeVagaId: String(data.cidadeVagaId),
          tipoAdmissao: (data.tipoAdmissao ?? '') as CandidatoForm['tipoAdmissao'],
          estadoCivil: toText(data.estadoCivil),
          grauInstrucao: toText(data.grauInstrucao),
          pis: formatPis(toText(data.pis)),
          raccor: data.raccor != null ? String(data.raccor) : '',
          nacionalidade: data.nacionalidade != null ? String(data.nacionalidade) : '',
          paisNascimento: toText(data.paisNascimento),
          estadoNascimento: toText(data.estadoNascimento),
          cidadeNascimentoCod:
            data.cidadeNascimentoCod != null ? String(data.cidadeNascimentoCod) : '',
          cidadeNascimentoNome: toText(data.cidadeNascimentoNome),
          pais: toText(data.pais),
          cep: formatCep(toText(data.cep)),
          estadoEndereco: toText(data.estadoEndereco),
          cidadeCod: data.cidadeCod != null ? String(data.cidadeCod) : '',
          cidadeNome: toText(data.cidadeNome),
          bairroCod: data.bairroCod != null ? String(data.bairroCod) : '',
          bairroNome: toText(data.bairroNome),
          tipoLogradouro: toText(data.tipoLogradouro),
          endereco: toText(data.endereco),
          numero: toText(data.numero),
          complemento: toText(data.complemento),
          ddiTelefone: toText(data.ddiTelefone),
          dddTelefone: toText(data.dddTelefone),
          numeroTelefone: toText(data.numeroTelefone),
          ddiTelefone2: toText(data.ddiTelefone2),
          dddTelefone2: toText(data.dddTelefone2),
          numeroTelefone2: toText(data.numeroTelefone2),
          numeroRg: toText(data.numeroRg),
          orgaoEmissorRg: toText(data.orgaoEmissorRg),
          dataExpedicaoRg: toDateInputValue(data.dataExpedicaoRg),
          numeroTituloEleitor: toText(data.numeroTituloEleitor),
          zonaTituloEleitor: toText(data.zonaTituloEleitor),
          secaoTituloEleitor: toText(data.secaoTituloEleitor),
          numeroCertReservista: toText(data.numeroCertReservista),
          tipoCertidaoCivil: toText(data.tipoCertidaoCivil),
          dataEmissaoCertidaoCivil: toDateInputValue(data.dataEmissaoCertidaoCivil),
          matriculaCertidaoCivil: toText(data.matriculaCertidaoCivil),
          termoMatriculaCertidao: toText(data.termoMatriculaCertidao),
          livroCertidaoCivil: toText(data.livroCertidaoCivil),
          folhaCertidaoCivil: toText(data.folhaCertidaoCivil),
          estadoCertidaoCivil: toText(data.estadoCertidaoCivil),
          cidadeCertidaoCivilCod:
            data.cidadeCertidaoCivilCod != null ? String(data.cidadeCertidaoCivilCod) : '',
          cidadeCertidaoCivilNome: toText(data.cidadeCertidaoCivilNome),
          tamanhoCamisa: toText(data.tamanhoCamisa),
          tamanhoCalca: toText(data.tamanhoCalca),
          tamanhoCalcado: toText(data.tamanhoCalcado),
        });
      })
      .catch(() => setError('Não foi possível carregar o candidato.'))
      .finally(() => setIsLoading(false));
  }, [id, mode, reset, estadosCert]);

  const onSubmit = async (values: CandidatoForm) => {
    if (isViewMode) return;

    setIsSaving(true);
    setError('');

    try {
      if (mode === 'edit') {
        await api.patch(`/candidatos/${id}`, buildPayload(values));
      } else {
        await api.post(
          '/candidatos',
          buildPayload(values, dependentesDraft, valeTransportesDraft, etapasDraft),
        );
      }
      navigate('/candidatos');
    } catch {
      setError('Não foi possível salvar o candidato. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const reloadCandidato = () => {
    if (!id) return;
    api
      .get<CandidatoResponse>(`/candidatos/${id}`)
      .then(({ data }) => setCandidato(normalizeCandidato(data)))
      .catch(() => {});
  };

  const closeLinkModal = (force = false) => {
    if (isSavingLink && !force) return;

    setLinkModalOpen(false);
    setSelectedRequisicao(null);
    setLinkModalError('');
  };

  const loadRequisicaoOptions = (
    inputValue: string,
    callback: (options: RequisicaoOption[]) => void,
  ) => {
    if (!candidato) {
      callback([]);
      return;
    }

    if (requisicaoSearchTimeout.current) clearTimeout(requisicaoSearchTimeout.current);

    requisicaoSearchTimeout.current = setTimeout(() => {
      api
        .get<RequisicaoDisponivel[]>('/requisicoes/disponiveis', {
          params: {
            candidatoId: candidato.id,
            limit: 20,
            q: inputValue.trim() || undefined,
          },
        })
        .then(({ data }) => callback(data.map(formatRequisicaoOption)))
        .catch(() => {
          setLinkModalError('Não foi possível carregar as requisições disponíveis.');
          callback([]);
        });
    }, 350);
  };

  const vincularRequisicao = async () => {
    if (!candidato || !selectedRequisicao) return;

    setIsSavingLink(true);
    setLinkModalError('');
    try {
      await api.post(`/requisicoes/${selectedRequisicao.value}/candidaturas`, {
        candidatoId: candidato.id,
      });
      reloadCandidato();
      closeLinkModal(true);
    } catch {
      setLinkModalError('Não foi possível vincular o candidato à requisição.');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleGrauParentescoChange = (value: string) => {
    const tipo = tiposGrauParentesco.find((item) => item.KEYNAM === value);
    setDependenteValue('descricaoGrauParentesco', tipo?.VALKEY ?? '');
  };

  const handleTipoEsocialChange = (value: string) => {
    const tipo = tiposDependenteEsocial.find((item) => String(item.codigo) === value);
    setDependenteValue('descricaoTipoEsocial', tipo?.descricao ?? '');
  };

  const handleNovoDependente = () => {
    setDependenteEditando(null);
    setDependenteError('');
    resetDependente(dependenteDefaultValues);
    setDependenteModalOpen(true);
  };

  const handleEditarDependente = (dependente: CandidatoDependenteData) => {
    setDependenteEditando(dependente);
    setDependenteModalOpen(true);
    resetDependente({
      nome: dependente.nome,
      codigoGrauParentesco: dependente.codigoGrauParentesco,
      descricaoGrauParentesco: dependente.descricaoGrauParentesco,
      codigoTipoEsocial: String(dependente.codigoTipoEsocial),
      descricaoTipoEsocial: dependente.descricaoTipoEsocial,
      sexo: dependente.sexo,
      dependenteIr: dependente.dependenteIr,
      dataNascimento: dependente.dataNascimento ? toDateInputValue(dependente.dataNascimento) : '',
      cpf: dependente.cpf,
    });
  };

  const handleCancelarDependente = () => {
    setDependenteModalOpen(false);
    setDependenteEditando(null);
    setDependenteError('');
    resetDependente(dependenteDefaultValues);
  };

  const onSubmitDependente = async (values: DependenteForm) => {
    if (isViewMode) return;

    setIsSavingDependente(true);
    setDependenteError('');

    try {
      const payload = buildDependentePayload(values);
      if (mode === 'create') {
        const draft = {
          ...payload,
          id: dependenteEditando?.id ?? -Date.now(),
          draftId: dependenteEditando?.draftId ?? crypto.randomUUID(),
        };
        setDependentesDraft((current) => {
          if (!dependenteEditando) return [...current, draft];
          return current.map((dependente) =>
            dependente.draftId === dependenteEditando.draftId ? draft : dependente,
          );
        });
      } else if (id) {
        if (dependenteEditando) {
          await api.patch(`/candidatos/${id}/dependentes/${dependenteEditando.id}`, payload);
        } else {
          await api.post(`/candidatos/${id}/dependentes`, payload);
        }
        reloadCandidato();
      }
      handleCancelarDependente();
    } catch {
      setDependenteError('Não foi possível salvar o dependente.');
    } finally {
      setIsSavingDependente(false);
    }
  };

  const dependentesList = mode === 'create' ? dependentesDraft : (candidato?.dependentes ?? []);

  const handleExcluirDependente = async (dependente: CandidatoDependenteData) => {
    if (isViewMode) return;
    try {
      if (mode === 'create') {
        setDependentesDraft((current) =>
          current.filter((item) => item.draftId !== dependente.draftId),
        );
        if (dependenteEditando?.draftId === dependente.draftId) handleCancelarDependente();
        return;
      }
      if (!id) return;
      await api.delete(`/candidatos/${id}/dependentes/${dependente.id}`);
      if (dependenteEditando?.id === dependente.id) handleCancelarDependente();
      reloadCandidato();
    } catch {
      setDependenteError('Não foi possível excluir o dependente.');
    }
  };

  const handleNovoValeTransporte = () => {
    setValeTransporteEditando(null);
    setValeTransporteError('');
    resetValeTransporte(valeTransporteDefaultValues);
    setValeTransporteModalOpen(true);
  };

  const handleEditarValeTransporte = (valeTransporte: CandidatoValeTransporteData) => {
    setValeTransporteEditando(valeTransporte);
    setValeTransporteModalOpen(true);
    resetValeTransporte({
      tipoTransporte: valeTransporte.tipoTransporte,
      tipoTrajeto: valeTransporte.tipoTrajeto,
      transporteUsado: valeTransporte.transporteUsado,
      preco: String(valeTransporte.preco).replace('.', ','),
    });
  };

  const handleCancelarValeTransporte = () => {
    setValeTransporteModalOpen(false);
    setValeTransporteEditando(null);
    setValeTransporteError('');
    resetValeTransporte(valeTransporteDefaultValues);
  };

  const onSubmitValeTransporte = async (values: ValeTransporteForm) => {
    if (isViewMode) return;

    setIsSavingValeTransporte(true);
    setValeTransporteError('');

    try {
      const payload = buildValeTransportePayload(values);
      if (mode === 'create') {
        const draft = {
          ...payload,
          id: valeTransporteEditando?.id ?? -Date.now(),
          draftId: valeTransporteEditando?.draftId ?? crypto.randomUUID(),
        };
        setValeTransportesDraft((current) => {
          if (!valeTransporteEditando) return [...current, draft];
          return current.map((valeTransporte) =>
            valeTransporte.draftId === valeTransporteEditando.draftId ? draft : valeTransporte,
          );
        });
      } else if (id) {
        if (valeTransporteEditando) {
          await api.patch(`/candidatos/${id}/vale-transportes/${valeTransporteEditando.id}`, payload);
        } else {
          await api.post(`/candidatos/${id}/vale-transportes`, payload);
        }
        reloadCandidato();
      }
      handleCancelarValeTransporte();
    } catch {
      setValeTransporteError('Não foi possível salvar o vale transporte.');
    } finally {
      setIsSavingValeTransporte(false);
    }
  };

  const valeTransportesList =
    mode === 'create' ? valeTransportesDraft : (candidato?.valeTransportes ?? []);

  const handleExcluirValeTransporte = async (valeTransporte: CandidatoValeTransporteData) => {
    if (isViewMode) return;
    try {
      if (mode === 'create') {
        setValeTransportesDraft((current) =>
          current.filter((item) => item.draftId !== valeTransporte.draftId),
        );
        if (valeTransporteEditando?.draftId === valeTransporte.draftId) handleCancelarValeTransporte();
        return;
      }
      if (!id) return;
      await api.delete(`/candidatos/${id}/vale-transportes/${valeTransporte.id}`);
      if (valeTransporteEditando?.id === valeTransporte.id) handleCancelarValeTransporte();
      reloadCandidato();
    } catch {
      setValeTransporteError('Não foi possível excluir o vale transporte.');
    }
  };

  const etapasList = mode === 'create' ? etapasDraft : (candidato?.etapas ?? []);

  const handleNovaEtapa = () => {
    setEtapaEditando(null);
    setEtapaError('');
    resetEtapa(etapaDefaultValues);
    setEtapaModalOpen(true);
  };

  const handleEditarEtapa = (etapa: CandidatoEtapaData) => {
    setEtapaEditando(etapa);
    setEtapaModalOpen(true);
    resetEtapa({
      codigoEtapa: String(etapa.codigoEtapa),
      data: etapa.data ? toDateInputValue(etapa.data) : '',
      observacao: etapa.observacao ?? '',
    });
  };

  const handleCancelarEtapa = () => {
    setEtapaModalOpen(false);
    setEtapaEditando(null);
    setEtapaError('');
    resetEtapa(etapaDefaultValues);
  };

  const onSubmitEtapa = async (values: EtapaForm) => {
    if (isViewMode) return;

    setIsSavingEtapa(true);
    setEtapaError('');

    try {
      const sequencia = etapaEditando?.sequencia ?? etapasList.length + 1;
      const payload = buildEtapaPayload(values, etapasSenior, sequencia);
      if (mode === 'create') {
        const draft = {
          ...payload,
          id: etapaEditando?.id ?? -Date.now(),
          draftId: etapaEditando?.draftId ?? crypto.randomUUID(),
        };
        setEtapasDraft((current) => {
          if (!etapaEditando) return [...current, draft];
          return current.map((etapa) => (etapa.draftId === etapaEditando.draftId ? draft : etapa));
        });
      } else if (id) {
        if (etapaEditando) {
          await api.patch(`/candidatos/${id}/etapas/${etapaEditando.id}`, payload);
        } else {
          await api.post(`/candidatos/${id}/etapas`, payload);
        }
        reloadCandidato();
      }
      handleCancelarEtapa();
    } catch {
      setEtapaError('Não foi possível salvar a etapa.');
    } finally {
      setIsSavingEtapa(false);
    }
  };

  const handleExcluirEtapa = async (etapa: CandidatoEtapaData) => {
    if (isViewMode) return;
    try {
      if (mode === 'create') {
        setEtapasDraft((current) => current.filter((item) => item.draftId !== etapa.draftId));
        if (etapaEditando?.draftId === etapa.draftId) handleCancelarEtapa();
        return;
      }
      if (!id) return;
      await api.delete(`/candidatos/${id}/etapas/${etapa.id}`);
      if (etapaEditando?.id === etapa.id) handleCancelarEtapa();
      reloadCandidato();
    } catch {
      setEtapaError('Não foi possível excluir a etapa.');
    }
  };

  // Consulta matrícula ativa para candidaturas EFETIVADAS ou com admissão dentro de ±7 dias
  useEffect(() => {
    if (!candidato) return;
    candidato.candidaturas.forEach((c) => {
      const deveConsultar = c.status === 'EFETIVADO' || (c.admissao !== null && isWithin7Days(c.admissao));
      if (!deveConsultar) return;
      if (matriculaAtiva[c.id] !== undefined) return; // já consultado
      api
        .get<{ numcad: number | null }>(`/integracao-senior/candidaturas/${c.id}/matricula-ativa`)
        .then(({ data }) => setMatriculaAtiva((prev) => ({ ...prev, [c.id]: data.numcad })))
        .catch(() => setMatriculaAtiva((prev) => ({ ...prev, [c.id]: null })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidato]);

  const handleCancelarEfetivacao = async (candidaturaId: number) => {
    setCancelandoId(candidaturaId);
    setCancelError((prev) => ({ ...prev, [candidaturaId]: '' }));
    try {
      await api.post(`/integracao-senior/candidaturas/${candidaturaId}/cancelar-efetivacao`);
      setMatriculaAtiva((prev) => { const n = { ...prev }; delete n[candidaturaId]; return n; });
      reloadCandidato();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao cancelar efetivação.';
      setCancelError((prev) => ({ ...prev, [candidaturaId]: msg }));
    } finally {
      setCancelandoId(null);
    }
  };

  const handleUpdateStatus = async (candidaturaId: number) => {
    const novoStatus = statusEdit[candidaturaId];
    if (!novoStatus) return;

    setIsSavingStatus((prev) => ({ ...prev, [candidaturaId]: true }));
    setStatusSaveError((prev) => ({ ...prev, [candidaturaId]: '' }));
    try {
      await api.patch(`/candidaturas/${candidaturaId}/status`, { status: novoStatus });
      reloadCandidato();
    } catch {
      setStatusSaveError((prev) => ({
        ...prev,
        [candidaturaId]: 'Não foi possível atualizar a situação.',
      }));
    } finally {
      setIsSavingStatus((prev) => ({ ...prev, [candidaturaId]: false }));
    }
  };

  const handleGerarAdmissao = async () => {
    if (!candidato || !admissaoData || !admissaoCandidaturaId) return;
    setIsGerandoAdmissao(true);
    setAdmissaoError('');
    try {
      const [year, month, day] = admissaoData.split('-');
      const datadmFormatted = `${day}/${month}/${year}`;
      await api.post('/integracao-senior/admissao', {
        candidatoId: candidato.id,
        candidaturaId: admissaoCandidaturaId,
        datadm: datadmFormatted,
      });
      reloadCandidato();
      setAdmissaoSuccess(true);
    } catch {
      setAdmissaoError('Erro ao gerar admissão. Verifique os dados e tente novamente.');
    } finally {
      setIsGerandoAdmissao(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admissão digital"
        title={getPageTitle(mode)}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/candidatos')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Card className="">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando candidato...
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card className="">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Nome</p>
                <p className="mt-1 font-semibold">{watch('nome') || candidato?.nome || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">CPF</p>
                <p className="mt-1 font-semibold">{watch('cpf') || candidato?.cpf || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Data de nascimento</p>
                <p className="mt-1 font-semibold">
                  {(watch('dataNascimento') || candidato?.dataNascimento)
                    ? toDateInputValue(watch('dataNascimento') || candidato?.dataNascimento || '')
                        .split('-')
                        .reverse()
                        .join('/')
                    : 'Não informado'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ================================================================
              Candidaturas vinculadas — acima do formulário
          ================================================================= */}
          {mode !== 'create' && (
            <Card className="">
              <CardHeader>
                <CardTitle>Candidaturas vinculadas</CardTitle>
                <CardDescription>
                  {candidato?.candidaturas.length ?? 0} vínculo(s) encontrado(s).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!candidato || candidato.candidaturas.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-background p-6 text-center">
                    <BriefcaseBusiness className="mx-auto h-7 w-7 text-muted-foreground" />
                    <p className="mt-2 font-semibold">Nenhuma candidatura vinculada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Vincule o candidato a uma requisição com vaga disponível.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setLinkModalOpen(true)}
                    >
                      <UserRoundPlus className="h-4 w-4" />
                      Vincular requisição
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {candidato.candidaturas.map((candidatura) => (
                      <div
                        key={candidatura.id}
                        className="flex flex-col gap-1 rounded-xl border bg-background p-4"
                      >
                        <p className="font-semibold leading-snug">
                          {candidatura.requisicao.empresa?.nome ?? 'Empresa não vinculada'}
                        </p>

                        <span
                          className={cn(
                            'mt-0.5 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            candidatura.status === 'EFETIVADO'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : candidatura.status === 'APROVADO'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : candidatura.status === 'REPROVADO' || candidatura.status === 'CANCELADO' || candidatura.status === 'DESISTIU'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {statusLabels[candidatura.status] ?? candidatura.status}
                        </span>

                        {mode === 'edit' && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Situação</p>
                            <select
                              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                              value={statusEdit[candidatura.id] ?? candidatura.status}
                              onChange={(e) =>
                                setStatusEdit((prev) => ({ ...prev, [candidatura.id]: e.target.value }))
                              }
                            >
                              {statusCandidaturaList.map((s) => (
                                <option key={s} value={s}>
                                  {statusLabels[s]}
                                </option>
                              ))}
                            </select>
                            {statusSaveError[candidatura.id] && (
                              <p className="text-xs text-destructive">{statusSaveError[candidatura.id]}</p>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled={
                                isSavingStatus[candidatura.id] ||
                                (statusEdit[candidatura.id] ?? candidatura.status) === candidatura.status
                              }
                              onClick={() => handleUpdateStatus(candidatura.id)}
                            >
                              {isSavingStatus[candidatura.id] ? 'Salvando...' : 'Atualizar situação'}
                            </Button>
                          </div>
                        )}

                        <div className="mt-2 space-y-1">
                          {candidatura.requisicao.postoTrabalhoNome && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Posto:</span>{' '}
                              {candidatura.requisicao.postoTrabalhoNome}
                            </p>
                          )}
                          {(candidatura.requisicao.escala || candidatura.requisicao.descricaoEscala) && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Horário:</span>{' '}
                              {[candidatura.requisicao.escala, candidatura.requisicao.descricaoEscala]
                                .filter(Boolean)
                                .join(' — ')}
                            </p>
                          )}
                          {candidatura.matricula && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Matrícula:</span>{' '}
                              <span className="font-semibold text-foreground">{candidatura.matricula}</span>
                            </p>
                          )}
                          {candidatura.admissao && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Admissão:</span>{' '}
                              <span className="font-semibold text-foreground">
                                {toDateInputValue(candidatura.admissao).split('-').reverse().join('/')}
                              </span>
                            </p>
                          )}
                        </div>

                        {candidatura.status === 'APROVADO' && !candidatura.admissao && (
                          <div className="mt-3">
                            <Button
                              type="button"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setAdmissaoCandidaturaId(candidatura.id);
                                setAdmissaoSuccess(false);
                                setAdmissaoError('');
                                setAdmissaoData('');
                              }}
                            >
                              Gerar admissão
                            </Button>
                          </div>
                        )}

                        {candidatura.status === 'EFETIVADO' && matriculaAtiva[candidatura.id] === null && (
                          <div className="mt-3 space-y-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full border-destructive text-destructive hover:bg-destructive/10"
                              disabled={cancelandoId === candidatura.id}
                              onClick={() => handleCancelarEfetivacao(candidatura.id)}
                            >
                              {cancelandoId === candidatura.id ? 'Cancelando...' : 'Cancelar efetivação'}
                            </Button>
                            {cancelError[candidatura.id] && (
                              <p className="text-xs text-destructive">{cancelError[candidatura.id]}</p>
                            )}
                          </div>
                        )}

                        {candidatura.admissao !== null &&
                          isWithin7Days(candidatura.admissao) &&
                          matriculaAtiva[candidatura.id] === null && (
                          <div className="mt-3">
                            <Button
                              type="button"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setAdmissaoCandidaturaId(candidatura.id);
                                setAdmissaoSuccess(false);
                                setAdmissaoError('');
                                setAdmissaoData('');
                              }}
                            >
                              Gerar nova admissão
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="cadastro" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
              <TabsTrigger value="valeTransporte">Vale Transporte</TabsTrigger>
              <TabsTrigger value="etapas">Etapas</TabsTrigger>
            </TabsList>

            <TabsContent value="cadastro" className="space-y-4">
              {/* ================================================================
                  Grade do formulário — 2 colunas em telas grandes
              ================================================================= */}
              <div className="grid gap-4 xl:grid-cols-2">

            {/* ---- Coluna A ---- */}
            <div className="space-y-4">

              {/* ---- Dados pessoais ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Dados pessoais</CardTitle>
                  <CardDescription>Identificação e características do candidato.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TextField
                    id="nome"
                    label="Nome completo"
                    required
                    disabled={isViewMode}
                    placeholder=""
                    error={errors.nome?.message}
                    {...register('nome')}
                  />

                  <SelectField
                    id="cidadeVagaId"
                    label="Cidade da vaga"
                    required
                    disabled={isViewMode}
                    error={errors.cidadeVagaId?.message}
                    {...register('cidadeVagaId')}
                  >
                    <option value="">Selecione</option>
                    {cidadesVaga.map((cidade) => (
                      <option key={cidade.id} value={cidade.id}>
                        {cidade.nome}
                      </option>
                    ))}
                  </SelectField>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MaskedTextField
                      id="cpf"
                      label="CPF"
                      required
                      control={control}
                      name="cpf"
                      mask={formatCpf}
                      disabled={isViewMode}
                      placeholder="000.000.000-00"
                      error={errors.cpf?.message}
                    />
                    <TextField
                      id="dataNascimento"
                      label="Data de nascimento"
                      required
                      type="date"
                      disabled={isViewMode}
                      error={errors.dataNascimento?.message}
                      {...register('dataNascimento')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      id="genero"
                      label="Gênero"
                      required
                      disabled={isViewMode}
                      error={errors.genero?.message}
                      {...register('genero')}
                    >
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </SelectField>

                    <SelectField
                      id="estadoCivil"
                      label="Estado civil"
                      required
                      disabled={isViewMode}
                      error={errors.estadoCivil?.message}
                      {...register('estadoCivil')}
                    >
                      <option value="">Selecione</option>
                      {estadosCivis.map((e) => (
                        <option key={e.KEYNAM} value={e.KEYNAM}>
                          {e.VALKEY}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      id="situacao"
                      label="Situação"
                      required
                      disabled={isViewMode}
                      error={errors.situacao?.message}
                      {...register('situacao')}
                    >
                      <option value="ATIVO_PROCESSO">Ativo no processo</option>
                      <option value="ELIMINADO">Eliminado</option>
                      <option value="DESISTENTE">Desistente</option>
                      <option value="ADMITIDO">Admitido</option>
                    </SelectField>
                    {exigeJustificativaReprovacao && (
                      <TextField
                        id="justificativaReprovacao"
                        label="Justificativa"
                        required
                        disabled={isViewMode}
                        error={errors.justificativaReprovacao?.message}
                        {...register('justificativaReprovacao')}
                      />
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      id="grauInstrucao"
                      label="Grau de instrução"
                      required
                      disabled={isViewMode}
                      error={errors.grauInstrucao?.message}
                      {...register('grauInstrucao')}
                    >
                      <option value="">Selecione</option>
                      {GRAUS_INSTRUCAO.map((g) => (
                        <option key={g.cod} value={g.cod}>
                          {g.cod} - {g.desc}
                        </option>
                      ))}
                    </SelectField>

                    <ReactSelectField
                      id="raccor"
                      label="Raça/Cor"
                      required
                      control={control}
                      name="raccor"
                      error={errors.raccor?.message}
                      isDisabled={isViewMode}
                      options={etnia.map((e) => ({ value: String(e.CODETN), label: e.DESETN }))}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      id="tipoAdmissao"
                      label="Tipo de admissão"
                      required
                      disabled={isViewMode}
                      error={errors.tipoAdmissao?.message}
                      {...register('tipoAdmissao')}
                    >
                      <option value="">Selecione</option>
                      <option value="PRIMEIRO_EMPREGO">Primeiro emprego</option>
                      <option value="REEMPREGO">Reemprego</option>
                    </SelectField>

                    <MaskedTextField
                      id="pis"
                      label="PIS"
                      control={control}
                      name="pis"
                      mask={formatPis}
                      disabled={isViewMode}
                      placeholder="000.00000.00-0"
                      error={errors.pis?.message}
                    />
                  </div>

                </CardContent>
              </Card>

              {/* ---- Naturalidade ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Naturalidade</CardTitle>
                  <CardDescription>País, estado e cidade de nascimento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReactSelectField
                      id="nacionalidade"
                      label="Nacionalidade"
                      required
                      control={control}
                      name="nacionalidade"
                      error={errors.nacionalidade?.message}
                      isDisabled={isViewMode}
                      options={nacionalidades.map((n) => ({
                        value: String(n.CODNAC),
                        label: n.DESNAC,
                      }))}
                    />

                    <ReactSelectField
                      id="paisNascimento"
                      label="País de nascimento"
                      required
                      control={control}
                      name="paisNascimento"
                      error={errors.paisNascimento?.message}
                      isDisabled={isViewMode}
                      options={paisesToOptions(paises)}
                      onChange={handlePaisNascChange}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReactSelectField
                      id="estadoNascimento"
                      label="Estado de nascimento"
                      required
                      control={control}
                      name="estadoNascimento"
                      error={errors.estadoNascimento?.message}
                      isDisabled={isViewMode || estadosNasc.length === 0}
                      options={estadosToOptions(estadosNasc)}
                      placeholder={
                        estadosNasc.length === 0 ? 'Selecione um país primeiro' : 'Selecione...'
                      }
                      onChange={handleEstadoNascChange}
                    />

                    <div className="space-y-2">
                      <ReactSelectField
                        id="cidadeNascimentoCod"
                        label="Cidade de nascimento"
                        required
                        control={control}
                        name="cidadeNascimentoCod"
                        error={errors.cidadeNascimentoCod?.message}
                        isDisabled={isViewMode || cidadesNasc.length === 0}
                        options={cidadesToOptions(cidadesNasc)}
                        placeholder={
                          cidadesNasc.length === 0 ? 'Selecione um estado primeiro' : 'Selecione...'
                        }
                        onChange={handleCidadeNascChange}
                      />
                      <input type="hidden" {...register('cidadeNascimentoNome')} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ---- Certidão civil ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Certidão civil</CardTitle>
                  <CardDescription>Dados do registro civil do candidato.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      id="tipoCertidaoCivil"
                      label="Tipo de certidão"
                      disabled={isViewMode}
                      {...register('tipoCertidaoCivil')}
                    >
                      <option value="">Selecione</option>
                      {tiposCertidao.map((t) => (
                        <option key={t.KEYNAM} value={t.KEYNAM}>
                          {t.VALKEY}
                        </option>
                      ))}
                    </SelectField>
                    <TextField
                      id="dataEmissaoCertidaoCivil"
                      label="Data de emissão"
                      type="date"
                      disabled={isViewMode}
                      {...register('dataEmissaoCertidaoCivil')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      id="matriculaCertidaoCivil"
                      label="Matrícula"
                      disabled={isViewMode}
                      {...register('matriculaCertidaoCivil')}
                    />
                    <TextField
                      id="termoMatriculaCertidao"
                      label="Termo/Matrícula"
                      disabled={isViewMode}
                      {...register('termoMatriculaCertidao')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      id="livroCertidaoCivil"
                      label="Livro"
                      disabled={isViewMode}
                      {...register('livroCertidaoCivil')}
                    />
                    <TextField
                      id="folhaCertidaoCivil"
                      label="Folha"
                      disabled={isViewMode}
                      {...register('folhaCertidaoCivil')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReactSelectField
                      id="estadoCertidaoCivil"
                      label="Estado"
                      control={control}
                      name="estadoCertidaoCivil"
                      isDisabled={isViewMode || estadosCert.length === 0}
                      options={estadosToOptions(estadosCert)}
                      placeholder={estadosCert.length === 0 ? 'Carregando...' : 'Selecione...'}
                      onChange={handleEstadoCertChange}
                    />

                    <div className="space-y-2">
                      <ReactSelectField
                        id="cidadeCertidaoCivilCod"
                        label="Cidade"
                        control={control}
                        name="cidadeCertidaoCivilCod"
                        isDisabled={isViewMode || cidadesCert.length === 0}
                        options={cidadesToOptions(cidadesCert)}
                        placeholder={
                          cidadesCert.length === 0 ? 'Selecione um estado primeiro' : 'Selecione...'
                        }
                        onChange={handleCidadeCertChange}
                      />
                      <input type="hidden" {...register('cidadeCertidaoCivilNome')} />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ---- Coluna B ---- */}
            <div className="space-y-4">

              {/* ---- Contatos ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Contatos</CardTitle>
                  <CardDescription>E-mail e telefones para comunicação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TextField
                    id="email"
                    label="E-mail"
                    required
                    disabled={isViewMode}
                    type="email"
                    placeholder="candidato@email.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />

                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Telefone principal <span className="text-destructive">*</span>
                    </p>
                    <div className="grid grid-cols-[4rem_5rem_1fr] gap-2">
                      <TextField
                        id="ddiTelefone"
                        label="DDI"
                        disabled={isViewMode}
                        placeholder="+55"
                        {...register('ddiTelefone')}
                      />
                      <TextField
                        id="dddTelefone"
                        label="DDD"
                        required
                        disabled={isViewMode}
                        placeholder="11"
                        {...register('dddTelefone')}
                      />
                      <TextField
                        id="numeroTelefone"
                        label="Número"
                        required
                        disabled={isViewMode}
                        placeholder="999999999"
                        {...register('numeroTelefone')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Telefone secundário</p>
                    <div className="grid grid-cols-[4rem_5rem_1fr] gap-2">
                      <TextField
                        id="ddiTelefone2"
                        label="DDI"
                        disabled={isViewMode}
                        placeholder="+55"
                        {...register('ddiTelefone2')}
                      />
                      <TextField
                        id="dddTelefone2"
                        label="DDD"
                        disabled={isViewMode}
                        placeholder="11"
                        {...register('dddTelefone2')}
                      />
                      <TextField
                        id="numeroTelefone2"
                        label="Número"
                        disabled={isViewMode}
                        placeholder="999999999"
                        {...register('numeroTelefone2')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ---- Endereço ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                  <CardDescription>Localização residencial atual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReactSelectField
                      id="pais"
                      label="País"
                      required
                      control={control}
                      name="pais"
                      error={errors.pais?.message}
                      isDisabled={isViewMode}
                      options={paisesToOptions(paises)}
                      onChange={handlePaisEndChange}
                    />

                    <MaskedTextField
                      id="cep"
                      label="CEP"
                      required
                      control={control}
                      name="cep"
                      mask={formatCep}
                      disabled={isViewMode}
                      placeholder="00000-000"
                      error={errors.cep?.message}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReactSelectField
                      id="estadoEndereco"
                      label="Estado"
                      required
                      control={control}
                      name="estadoEndereco"
                      error={errors.estadoEndereco?.message}
                      isDisabled={isViewMode || estadosEnd.length === 0}
                      options={estadosToOptions(estadosEnd)}
                      placeholder={
                        estadosEnd.length === 0 ? 'Selecione um país primeiro' : 'Selecione...'
                      }
                      onChange={handleEstadoEndChange}
                    />

                    <div className="space-y-2">
                      <ReactSelectField
                        id="cidadeCod"
                        label="Cidade"
                        required
                        control={control}
                        name="cidadeCod"
                        error={errors.cidadeCod?.message}
                        isDisabled={isViewMode || cidadesEnd.length === 0}
                        options={cidadesToOptions(cidadesEnd)}
                        placeholder={
                          cidadesEnd.length === 0 ? 'Selecione um estado primeiro' : 'Selecione...'
                        }
                        onChange={handleCidadeEndChange}
                      />
                      <input type="hidden" {...register('cidadeNome')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ReactSelectField
                      id="bairroCod"
                      label="Bairro"
                      required
                      control={control}
                      name="bairroCod"
                      error={errors.bairroNome?.message}
                      isDisabled={isViewMode || bairrosEnd.length === 0}
                      options={bairrosToOptions(bairrosEnd)}
                      placeholder={
                        bairrosEnd.length === 0 ? 'Selecione uma cidade primeiro' : 'Selecione...'
                      }
                      onChange={handleBairroEndChange}
                    />
                    <input type="hidden" {...register('bairroNome')} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[auto_1fr_6rem]">
                    <ReactSelectField
                      id="tipoLogradouro"
                      label="Logradouro"
                      required
                      control={control}
                      name="tipoLogradouro"
                      isDisabled={isViewMode}
                      error={errors.tipoLogradouro?.message}
                      options={tiposLogradouro.map((t) => ({ value: t.KEYNAM, label: t.VALKEY }))}
                    />

                    <TextField
                      id="endereco"
                      label="Endereço"
                      required
                      disabled={isViewMode}
                      placeholder="Nome da rua/av."
                      error={errors.endereco?.message}
                      {...register('endereco')}
                    />
                    <TextField
                      id="numero"
                      label="Número"
                      required
                      disabled={isViewMode}
                      placeholder="123"
                      error={errors.numero?.message}
                      {...register('numero')}
                    />
                  </div>

                  <TextField
                    id="complemento"
                    label="Complemento"
                    disabled={isViewMode}
                    placeholder="Apto, bloco..."
                    {...register('complemento')}
                  />
                </CardContent>
              </Card>

              {/* ---- Documentos ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Documentos</CardTitle>
                  <CardDescription>RG, título de eleitor e reservista.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Carteira de identidade (RG)
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <TextField
                        id="numeroRg"
                        label="Número"
                        disabled={isViewMode}
                        {...register('numeroRg')}
                      />
                      <TextField
                        id="orgaoEmissorRg"
                        label="Órgão emissor"
                        disabled={isViewMode}
                        placeholder="SSP/SP"
                        {...register('orgaoEmissorRg')}
                      />
                      <TextField
                        id="dataExpedicaoRg"
                        label="Expedição"
                        type="date"
                        disabled={isViewMode}
                        {...register('dataExpedicaoRg')}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Título de eleitor
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <TextField
                        id="numeroTituloEleitor"
                        label="Número"
                        disabled={isViewMode}
                        {...register('numeroTituloEleitor')}
                      />
                      <TextField
                        id="zonaTituloEleitor"
                        label="Zona"
                        disabled={isViewMode}
                        {...register('zonaTituloEleitor')}
                      />
                      <TextField
                        id="secaoTituloEleitor"
                        label="Seção"
                        disabled={isViewMode}
                        {...register('secaoTituloEleitor')}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Reservista
                    </p>
                    <TextField
                      id="numeroCertReservista"
                      label="Número do certificado"
                      disabled={isViewMode}
                      {...register('numeroCertReservista')}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ---- Uniforme ---- */}
              <Card className="">
                <CardHeader>
                  <CardTitle>Uniforme</CardTitle>
                  <CardDescription>Medidas para fornecimento de uniforme.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <TextField
                      id="tamanhoCamisa"
                      label="Tamanho da camisa"
                      placeholder="Ex: P, M, G, GG"
                      disabled={isViewMode}
                      {...register('tamanhoCamisa')}
                    />
                    <TextField
                      id="tamanhoCalca"
                      label="Tamanho da calça"
                      placeholder="Ex: P, M, 42, 44"
                      disabled={isViewMode}
                      {...register('tamanhoCalca')}
                    />
                    <TextField
                      id="tamanhoCalcado"
                      label="Número do calçado"
                      placeholder="Ex: 38, 39, 40"
                      disabled={isViewMode}
                      {...register('tamanhoCalcado')}
                    />
                  </div>
                </CardContent>
              </Card>

              </div>
              </div>
            </TabsContent>

            <TabsContent value="dependentes" className="space-y-4">
                <Card className="">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Dependentes cadastrados</CardTitle>
                      <CardDescription>
                        {dependentesList.length} dependente(s) vinculado(s).
                      </CardDescription>
                    </div>
                    {!isViewMode && (
                      <Button type="button" onClick={handleNovoDependente}>
                        Novo dependente
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dependentesList.length === 0 ? (
                      <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
                        Nenhum dependente cadastrado.
                      </div>
                    ) : (
                      dependentesList.map((dependente) => (
                        <div
                          key={dependente.draftId ?? dependente.id}
                          className="flex flex-col gap-3 rounded-xl border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div>
                            <p className="font-semibold">{dependente.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {[
                                dependente.dependenteIr && dependente.cpf ? dependente.cpf : null,
                                dependente.descricaoGrauParentesco,
                                dependente.descricaoTipoEsocial,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {[
                                dependente.sexo === 'MASCULINO' ? 'Masculino' : 'Feminino',
                                dependente.dataNascimento
                                  ? `Nascimento ${toDateInputValue(dependente.dataNascimento)}`
                                  : null,
                                `IR ${dependente.dependenteIr ? 'Sim' : 'Não'}`,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </p>
                          </div>
                          {!isViewMode && (
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={() => handleEditarDependente(dependente)}>
                                Editar
                              </Button>
                              <Button type="button" variant="outline" onClick={() => handleExcluirDependente(dependente)}>
                                Excluir
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            <TabsContent value="valeTransporte" className="space-y-4">
              <Card className="">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Trajetos cadastrados</CardTitle>
                    <CardDescription>
                      {valeTransportesList.length} trajeto(s) vinculado(s).
                    </CardDescription>
                  </div>
                  {!isViewMode && (
                    <Button type="button" onClick={handleNovoValeTransporte}>
                      Novo vale transporte
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {valeTransportesList.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
                      Nenhum trajeto cadastrado.
                    </div>
                  ) : (
                    valeTransportesList.map((valeTransporte) => (
                      <div
                        key={valeTransporte.draftId ?? valeTransporte.id}
                        className="flex flex-col gap-3 rounded-xl border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <p className="font-semibold">{valeTransporte.transporteUsado}</p>
                          <p className="text-sm text-muted-foreground">
                            {valeTransporte.tipoTransporte} • {valeTransporte.tipoTrajeto}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Preço R$ {String(valeTransporte.preco).replace('.', ',')}
                          </p>
                        </div>
                        {!isViewMode && (
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => handleEditarValeTransporte(valeTransporte)}>
                              Editar
                            </Button>
                            <Button type="button" variant="outline" onClick={() => handleExcluirValeTransporte(valeTransporte)}>
                              Excluir
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="etapas" className="space-y-4">
              <Card className="">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Etapas do processo</CardTitle>
                    <CardDescription>{etapasList.length} etapa(s) vinculada(s).</CardDescription>
                  </div>
                  {!isViewMode && (
                    <Button type="button" onClick={handleNovaEtapa}>
                      Nova etapa
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {etapasList.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
                      Nenhuma etapa cadastrada.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2">Sequência</th>
                            <th className="px-4 py-2">Etapa</th>
                            <th className="px-4 py-2">Data</th>
                            <th className="px-4 py-2">Observação</th>
                            {!isViewMode && <th className="px-4 py-2 text-right">Ações</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {[...etapasList]
                            .sort((a, b) => a.sequencia - b.sequencia)
                            .map((etapa) => (
                              <tr key={etapa.draftId ?? etapa.id} className="border-t">
                                <td className="px-4 py-3">{etapa.sequencia}</td>
                                <td className="px-4 py-3 font-medium">{etapa.descricaoEtapa}</td>
                                <td className="px-4 py-3">
                                  {etapa.data ? toDateInputValue(etapa.data).split('-').reverse().join('/') : '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {etapa.observacao || '—'}
                                </td>
                                {!isViewMode && (
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditarEtapa(etapa)}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExcluirEtapa(etapa)}
                                      >
                                        Excluir
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ---- Ações ---- */}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isViewMode && (
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar candidato'}
              </Button>
            )}
            {mode !== 'create' && candidato && candidato.candidaturas.length === 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkModalOpen(true)}
                className="w-full sm:w-auto"
              >
                <UserRoundPlus className="h-4 w-4" />
                Vincular requisição
              </Button>
            )}
            {isViewMode && candidato && (
              <Button
                type="button"
                onClick={() => navigate(`/candidatos/${candidato.id}/editar`)}
                className="w-full sm:w-auto"
              >
                <Edit3 className="h-4 w-4" />
                Editar candidato
              </Button>
            )}
          </div>

        </form>
      )}

      {dependenteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {dependenteEditando ? 'Editar dependente' : 'Novo dependente'}
                </h2>
                <p className="text-sm text-muted-foreground">Cadastro dos dependentes vinculados ao candidato.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCancelarDependente}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField id="dependenteNome" label="Nome" required disabled={isViewMode} error={dependenteErrors.nome?.message} {...registerDependente('nome')} />
                {dependenteIrSelecionado && (
                  <TextField id="dependenteCpf" label="CPF" required disabled={isViewMode} error={dependenteErrors.cpf?.message} {...registerDependente('cpf')} />
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ReactSelectField id="codigoGrauParentesco" label="Grau de parentesco" required control={dependenteControl} name="codigoGrauParentesco" isDisabled={isViewMode} options={tiposGrauParentesco.map((tipo) => ({ value: tipo.KEYNAM, label: `${tipo.KEYNAM} - ${tipo.VALKEY}` }))} error={dependenteErrors.codigoGrauParentesco?.message} onChange={handleGrauParentescoChange} />
                <ReactSelectField id="codigoTipoEsocial" label="Tipo eSocial" required control={dependenteControl} name="codigoTipoEsocial" isDisabled={isViewMode} options={tiposDependenteEsocial.map((tipo) => ({ value: String(tipo.codigo), label: `${tipo.codigo} - ${tipo.descricao}` }))} error={dependenteErrors.codigoTipoEsocial?.message} onChange={handleTipoEsocialChange} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField id="dependenteSexo" label="Sexo" required disabled={isViewMode} error={dependenteErrors.sexo?.message} {...registerDependente('sexo')}>
                  <option value="">Selecione</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                </SelectField>
                <TextField id="dependenteDataNascimento" label="Data de nascimento" type="date" disabled={isViewMode} error={dependenteErrors.dataNascimento?.message} {...registerDependente('dataNascimento')} />
                <label className="mt-7 flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
                  <input type="checkbox" disabled={isViewMode} {...registerDependente('dependenteIr')} />
                  Dependente IR
                </label>
              </div>
              <input type="hidden" {...registerDependente('descricaoGrauParentesco')} />
              <input type="hidden" {...registerDependente('descricaoTipoEsocial')} />
              {dependenteError && <p className="text-sm text-destructive">{dependenteError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-muted/35 p-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleCancelarDependente} disabled={isSavingDependente}>Cancelar</Button>
              <Button type="button" disabled={isSavingDependente} onClick={handleSubmitDependente(onSubmitDependente)}>
                {isSavingDependente ? 'Salvando...' : 'Salvar dependente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {valeTransporteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {valeTransporteEditando ? 'Editar vale transporte' : 'Novo vale transporte'}
                </h2>
                <p className="text-sm text-muted-foreground">Cadastro dos trajetos de vale transporte do candidato.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCancelarValeTransporte}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField id="tipoTransporte" label="Tipo de transporte" required disabled={isViewMode} error={valeTransporteErrors.tipoTransporte?.message} {...registerValeTransporte('tipoTransporte')}>
                  <option value="">Selecione</option>
                  <option value="ONIBUS">Ônibus</option>
                  <option value="METRO">Metrô</option>
                  <option value="TREM">Trem</option>
                </SelectField>
                <SelectField id="tipoTrajeto" label="Tipo de trajeto" required disabled={isViewMode} error={valeTransporteErrors.tipoTrajeto?.message} {...registerValeTransporte('tipoTrajeto')}>
                  <option value="">Selecione</option>
                  <option value="RESIDENCIA_TRABALHO">Residência para trabalho</option>
                  <option value="TRABALHO_RESIDENCIA">Trabalho para residência</option>
                </SelectField>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                <TextField id="transporteUsado" label="Transporte usado" required disabled={isViewMode} error={valeTransporteErrors.transporteUsado?.message} {...registerValeTransporte('transporteUsado')} />
                <TextField id="preco" label="Preço" required disabled={isViewMode} placeholder="0,00" error={valeTransporteErrors.preco?.message} {...registerValeTransporte('preco')} />
              </div>
              {valeTransporteError && <p className="text-sm text-destructive">{valeTransporteError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-muted/35 p-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleCancelarValeTransporte} disabled={isSavingValeTransporte}>Cancelar</Button>
              <Button type="button" disabled={isSavingValeTransporte} onClick={handleSubmitValeTransporte(onSubmitValeTransporte)}>
                {isSavingValeTransporte ? 'Salvando...' : 'Salvar vale transporte'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {etapaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {etapaEditando ? 'Editar etapa' : 'Nova etapa'}
                </h2>
                <p className="text-sm text-muted-foreground">Etapas do processo seletivo vinculadas ao candidato.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleCancelarEtapa}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField id="codigoEtapa" label="Etapa" required disabled={isViewMode} error={etapaErrors.codigoEtapa?.message} {...registerEtapa('codigoEtapa')}>
                  <option value="">Selecione</option>
                  {etapasSenior.map((etapa) => (
                    <option key={etapa.CODETA} value={etapa.CODETA}>
                      {etapa.DESETA}
                    </option>
                  ))}
                </SelectField>
                <TextField id="etapaData" label="Data" type="date" disabled={isViewMode} error={etapaErrors.data?.message} {...registerEtapa('data')} />
              </div>
              <TextareaField id="etapaObservacao" label="Observação" disabled={isViewMode} error={etapaErrors.observacao?.message} {...registerEtapa('observacao')} />
              {etapaError && <p className="text-sm text-destructive">{etapaError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-muted/35 p-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleCancelarEtapa} disabled={isSavingEtapa}>Cancelar</Button>
              <Button type="button" disabled={isSavingEtapa} onClick={handleSubmitEtapa(onSubmitEtapa)}>
                {isSavingEtapa ? 'Salvando...' : 'Salvar etapa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {linkModalOpen && candidato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Vincular a requisição
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  {candidato.nome || formatCpf(candidato.cpf)}
                </h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => closeLinkModal()}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <label className="space-y-2">
                <span className="text-sm font-medium">Buscar requisição com vaga disponível</span>
                <AsyncSelect<RequisicaoOption, false>
                  cacheOptions
                  defaultOptions
                  loadOptions={loadRequisicaoOptions}
                  loadingMessage={() => 'Buscando requisições...'}
                  noOptionsMessage={({ inputValue }) =>
                    inputValue.trim()
                      ? 'Nenhuma requisição disponível encontrada'
                      : 'Nenhuma requisição aberta com vaga disponível'
                  }
                  placeholder="Digite cargo, empresa, filial, setor ou nº da requisição"
                  styles={selectStyles as unknown as StylesConfig<RequisicaoOption, false>}
                  value={selectedRequisicao}
                  onChange={setSelectedRequisicao}
                />
              </label>
              {selectedRequisicao && (
                <div className="rounded-xl border bg-muted/35 p-3 text-sm">
                  <p className="font-semibold">{selectedRequisicao.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedRequisicao.requisicao.filialNome ?? 'Filial não informada'} ·{' '}
                    {selectedRequisicao.requisicao.ccustoNome ?? 'Setor não informado'}
                  </p>
                  {selectedRequisicao.requisicao.descricaoEscala && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium">Horário:</span>{' '}
                      {selectedRequisicao.requisicao.descricaoEscala}
                    </p>
                  )}
                </div>
              )}
              {linkModalError && <p className="text-sm text-destructive">{linkModalError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-muted/35 p-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeLinkModal()}
                disabled={isSavingLink}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={vincularRequisicao}
                disabled={!selectedRequisicao || isSavingLink}
              >
                {isSavingLink ? 'Vinculando...' : 'Confirmar vínculo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {admissaoCandidaturaId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Gerar admissão no Senior</h2>
            {admissaoSuccess ? (
              <>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Admissão gerada com sucesso! A requisição foi marcada como integrada.
                </p>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setAdmissaoCandidaturaId(null)}>
                    Fechar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Informe a data de admissão para integrar o colaborador no sistema Senior.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="datadm">Data de admissão</Label>
                  <Input
                    id="datadm"
                    type="date"
                    value={admissaoData}
                    onChange={(e) => setAdmissaoData(e.target.value)}
                  />
                </div>
                {admissaoError && <p className="text-sm text-destructive">{admissaoError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAdmissaoCandidaturaId(null)}
                    disabled={isGerandoAdmissao}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGerarAdmissao}
                    disabled={!admissaoData || isGerandoAdmissao}
                  >
                    {isGerandoAdmissao ? 'Gerando...' : 'Confirmar admissão'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
