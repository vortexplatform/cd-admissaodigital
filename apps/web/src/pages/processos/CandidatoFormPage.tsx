import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, BriefcaseBusiness, Edit3, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Control, Controller, Path, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import ReactSelect from 'react-select';
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
interface Bairro {
  CODCID: number;
  CODBAI: number;
  NOMBAI: string;
}
interface OpcaoChave {
  KEYNAM: string;
  VALKEY: string;
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
interface CandidatoData {
  id: number;
  cpf: string;
  dataNascimento: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  genero: string | null;
  possuiFilhos: boolean;
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
  candidaturas: CandidaturaResumo[];
}

// ---------------------------------------------------------------------------
// Schema Zod
// ---------------------------------------------------------------------------
const candidatoSchema = z.object({
  cpf: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length === 11, 'Informe um CPF com 11 dígitos'),
  dataNascimento: z.string().trim().min(1, 'Informe a data de nascimento'),
  nome: z.string().trim().optional(),
  email: z.string().trim().email('Informe um e-mail válido').optional().or(z.literal('')),
  telefone: z.string().trim().optional(),
  genero: z.enum(['', 'M', 'F']).optional(),
  possuiFilhos: z.boolean().optional(),

  // Admissão
  tipoAdmissao: z.enum(['', 'PRIMEIRO_EMPREGO', 'REEMPREGO']).optional(),

  // Dados pessoais adicionais
  estadoCivil: z.string().trim().optional(),
  grauInstrucao: z.string().trim().optional(),
  pis: z.string().trim().optional(),
  raccor: z.string().trim().optional(),

  // Naturalidade
  nacionalidade: z.string().trim().optional(),
  paisNascimento: z.string().trim().optional(),
  estadoNascimento: z.string().trim().optional(),
  cidadeNascimentoCod: z.string().trim().optional(),
  cidadeNascimentoNome: z.string().trim().optional(),

  // Endereço
  pais: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  estadoEndereco: z.string().trim().optional(),
  cidadeCod: z.string().trim().optional(),
  cidadeNome: z.string().trim().optional(),
  bairroCod: z.string().trim().optional(),
  bairroNome: z.string().trim().optional(),
  tipoLogradouro: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  numero: z.string().trim().optional(),
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
});

type CandidatoForm = z.infer<typeof candidatoSchema>;
type CandidatoMode = 'create' | 'edit' | 'view';

const defaultValues: CandidatoForm = {
  cpf: '',
  dataNascimento: '',
  nome: '',
  email: '',
  telefone: '',
  genero: '',
  possuiFilhos: false,
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
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toDateInputValue = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');
const toText = (value: string | null | undefined) => value ?? '';
const optionalString = (value?: string) => value?.trim() || undefined;

const isWithin7Days = (dateStr: string | null | undefined) => {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.abs(diff) <= 7 * 24 * 60 * 60 * 1000;
};
const optionalInt = (value?: string) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
};

const buildPayload = (values: CandidatoForm) => ({
  cpf: values.cpf.replace(/\D/g, ''),
  dataNascimento: values.dataNascimento,
  nome: optionalString(values.nome),
  email: optionalString(values.email),
  telefone: optionalString(values.telefone),
  genero: optionalString(values.genero),
  possuiFilhos: Boolean(values.possuiFilhos),
  tipoAdmissao: optionalString(values.tipoAdmissao),
  estadoCivil: optionalString(values.estadoCivil),
  grauInstrucao: optionalString(values.grauInstrucao),
  pis: optionalString(values.pis),
  raccor: values.raccor ? parseInt(values.raccor) : undefined,
  nacionalidade: optionalInt(values.nacionalidade),
  paisNascimento: optionalString(values.paisNascimento),
  estadoNascimento: optionalString(values.estadoNascimento),
  cidadeNascimentoCod: optionalInt(values.cidadeNascimentoCod),
  cidadeNascimentoNome: optionalString(values.cidadeNascimentoNome),
  pais: optionalString(values.pais),
  cep: optionalString(values.cep),
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
});

const getPageTitle = (mode: CandidatoMode) => {
  if (mode === 'create') return 'Novo candidato';
  if (mode === 'edit') return 'Editar candidato';
  return 'Visualizar candidato';
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

function ReactSelectField({
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
  control: Control<CandidatoForm>;
  name: Path<CandidatoForm>;
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CandidatoForm>({ resolver: zodResolver(candidatoSchema), defaultValues });

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
      .get<CandidatoData>(`/candidatos/${id}`)
      .then(async ({ data }) => {
        setCandidato(data);

        // Inicializa status editável por candidatura
        const statusInit: Record<number, string> = {};
        data.candidaturas.forEach((c) => { statusInit[c.id] = c.status; });
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
          cpf: data.cpf,
          dataNascimento: toDateInputValue(data.dataNascimento),
          nome: toText(data.nome),
          email: toText(data.email),
          telefone: toText(data.telefone),
          genero: (data.genero as 'M' | 'F' | null) ?? '',
          possuiFilhos: data.possuiFilhos,
          tipoAdmissao: (data.tipoAdmissao ?? '') as CandidatoForm['tipoAdmissao'],
          estadoCivil: toText(data.estadoCivil),
          grauInstrucao: toText(data.grauInstrucao),
          pis: toText(data.pis),
          raccor: data.raccor != null ? String(data.raccor) : '',
          nacionalidade: data.nacionalidade != null ? String(data.nacionalidade) : '',
          paisNascimento: toText(data.paisNascimento),
          estadoNascimento: toText(data.estadoNascimento),
          cidadeNascimentoCod:
            data.cidadeNascimentoCod != null ? String(data.cidadeNascimentoCod) : '',
          cidadeNascimentoNome: toText(data.cidadeNascimentoNome),
          pais: toText(data.pais),
          cep: toText(data.cep),
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
        await api.post('/candidatos', buildPayload(values));
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
    api.get<CandidatoData>(`/candidatos/${id}`).then(({ data }) => setCandidato(data)).catch(() => {});
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
        description={
          isViewMode
            ? 'Consulte os dados do candidato e as candidaturas vinculadas.'
            : 'Preencha os dados pessoais usados nas requisições de admissão.'
        }
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
        <Card className="shadow-corporate">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando candidato...
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ================================================================
              Candidaturas vinculadas — acima do formulário
          ================================================================= */}
          {mode !== 'create' && (
            <Card className="shadow-corporate">
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
                      O vínculo é feito na lista de requisições.
                    </p>
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

          {/* ================================================================
              Grade do formulário — 2 colunas em telas grandes
          ================================================================= */}
          <div className="grid gap-4 xl:grid-cols-2">

            {/* ---- Coluna A ---- */}
            <div className="space-y-4">

              {/* ---- Dados pessoais ---- */}
              <Card className="shadow-corporate">
                <CardHeader>
                  <CardTitle>Dados pessoais</CardTitle>
                  <CardDescription>Identificação e características do candidato.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TextField
                    id="nome"
                    label="Nome completo"
                    disabled={isViewMode}
                    placeholder="Ex.: Ana C. Silva"
                    {...register('nome')}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      id="cpf"
                      label="CPF"
                      required
                      disabled={isViewMode}
                      placeholder="00000000000"
                      error={errors.cpf?.message}
                      {...register('cpf')}
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
                      disabled={isViewMode}
                      {...register('genero')}
                    >
                      <option value="">Não informado</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </SelectField>

                    <SelectField
                      id="estadoCivil"
                      label="Estado civil"
                      required
                      disabled={isViewMode}
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
                      id="grauInstrucao"
                      label="Grau de instrução"
                      required
                      disabled={isViewMode}
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
                      control={control}
                      name="raccor"
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
                      {...register('tipoAdmissao')}
                    >
                      <option value="">Selecione</option>
                      <option value="PRIMEIRO_EMPREGO">Primeiro emprego</option>
                      <option value="REEMPREGO">Reemprego</option>
                    </SelectField>

                    <TextField
                      id="pis"
                      label="PIS"
                      disabled={isViewMode}
                      placeholder="000.00000.00-0"
                      {...register('pis')}
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm w-fit">
                    <input type="checkbox" disabled={isViewMode} {...register('possuiFilhos')} />
                    Possui filhos
                  </label>
                </CardContent>
              </Card>

              {/* ---- Naturalidade ---- */}
              <Card className="shadow-corporate">
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
              <Card className="shadow-corporate">
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
              <Card className="shadow-corporate">
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
              <Card className="shadow-corporate">
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
                      isDisabled={isViewMode}
                      options={paisesToOptions(paises)}
                      onChange={handlePaisEndChange}
                    />

                    <TextField
                      id="cep"
                      label="CEP"
                      required
                      disabled={isViewMode}
                      placeholder="00000-000"
                      {...register('cep')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReactSelectField
                      id="estadoEndereco"
                      label="Estado"
                      required
                      control={control}
                      name="estadoEndereco"
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
                    <SelectField
                      id="tipoLogradouro"
                      label="Tipo"
                      required
                      disabled={isViewMode}
                      {...register('tipoLogradouro')}
                    >
                      <option value="">Sel.</option>
                      {tiposLogradouro.map((t) => (
                        <option key={t.KEYNAM} value={t.KEYNAM}>
                          {t.VALKEY}
                        </option>
                      ))}
                    </SelectField>

                    <TextField
                      id="endereco"
                      label="Logradouro"
                      required
                      disabled={isViewMode}
                      placeholder="Nome da rua/av."
                      {...register('endereco')}
                    />
                    <TextField
                      id="numero"
                      label="Número"
                      required
                      disabled={isViewMode}
                      placeholder="123"
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
              <Card className="shadow-corporate">
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

            </div>
          </div>

          {/* ---- Ações ---- */}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isViewMode && (
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar candidato'}
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
