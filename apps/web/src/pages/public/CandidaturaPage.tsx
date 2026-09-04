import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck, Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import Select, { type StylesConfig } from 'react-select';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

const vagas = [
  'Açougueiro',
  'Auxiliar de Depósito',
  'Auxiliar de Limpeza',
  'Auxiliar de Hortifruti',
  'Auxiliar de Frios',
  'Auxiliar de Padaria',
  'Embalador',
  'Padeiro',
  'Prevenção e Perdas',
  'Operador de Caixa',
  'Repositor',
];
const graus = [
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
];

type Experiencia = {
  empresa: string;
  cargo: string;
  admissao: string;
  demissao: string;
  motivoSaida: string;
};
type DadosVaga = {
  bairro: string;
  estudoHorario: string;
  disponibilidadeHorario: string;
  nomePai: string;
  nomeMae: string;
  indicadoFuncionario: string;
  indicadoLojaSetor: string;
  parenteEmpresa: string;
  parenteNome: string;
  parenteLojaSetor: string;
  aposentado: string;
  aposentadoriaTipo: string;
  conducaoPropria: string;
};
type Form = {
  vagas: string[];
  pcd: 'sim' | 'nao';
  pretensaoSalarial: string;
  cpf: string;
  nome: string;
  dataNascimento: string;
  email: string;
  dddTelefone: string;
  telefone: string;
  estadoCivil: string;
  raccor: string;
  grauInstrucao: string;
  cidadeVagaId: string;
  cep: string;
  estadoEndereco: string;
  cidadeNome: string;
  bairroNome: string;
  tipoLogradouro: string;
  endereco: string;
  numero: string;
  complemento: string;
  dadosVaga: DadosVaga;
  lojasProximas: string[];
  experiencias: Experiencia[];
  bairrosVaga: string[];
};
type Candidate = Partial<Omit<Form, 'lojasProximas' | 'experiencias'>> & {
  id: number;
  cpf: string;
  numeroTelefone?: string;
  lojasProximas?: { codfil: number }[];
  experiencias?: Experiencia[];
};
type Options = {
  cidadesVaga: { id: number; nome: string; codcid: number }[];
  estadosCivis: { KEYNAM: string; VALKEY: string }[];
  etnia: { CODETN: number; DESETN: string }[];
  filiais: { CODFIL: number; NOMFIL: string }[];
  paises: { CODPAI: number; NOMPAI: string }[];
};
type Estado = { CODEST: string; DESEST: string };
type Cidade = { CODCID: number; NOMCID: string };
type BairroVaga = { CODFIL: number; CODBAI: number; NOMBAI: string };
type LocationState = { vaga?: string } | null;

const cpfDigits = (value: string) => value.replace(/\D/g, '').slice(0, 11);
const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};
const formatMonthYear = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const monthYearFromDate = (value: string) => {
  const [year, month] = value.slice(0, 10).split('-');
  return year && month ? `${month}/${year}` : '';
};
const monthYearToDate = (value: string) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(value);
  return match ? `${match[2]}-${match[1]}-01` : undefined;
};
const formatBairro = (value: string) =>
  value
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word) => (word ? word[0].toLocaleUpperCase('pt-BR') + word.slice(1) : word))
    .join(' ');
const money = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        Number(digits) / 100,
      )
    : '';
};
const bool = (value: string) => value === 'sim';
const uppercaseValues = <T,>(value: T): T => {
  if (typeof value === 'string') return value.toUpperCase() as T;
  if (Array.isArray(value)) return value.map(uppercaseValues) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, uppercaseValues(item)]),
    ) as T;
  }
  return value;
};
const emptyDadosVaga: DadosVaga = {
  bairro: '',
  estudoHorario: '',
  disponibilidadeHorario: '',
  nomePai: '',
  nomeMae: '',
  indicadoFuncionario: '',
  indicadoLojaSetor: '',
  parenteEmpresa: '',
  parenteNome: '',
  parenteLojaSetor: '',
  aposentado: '',
  aposentadoriaTipo: '',
  conducaoPropria: '',
};
const emptyExperiencia: Experiencia = {
  empresa: '',
  cargo: '',
  admissao: '',
  demissao: '',
  motivoSaida: '',
};

const publicSelectStyles: StylesConfig<{ value: string; label: string }, false> = {
  control: (base) => ({
    ...base,
    minHeight: 44,
    backgroundColor: '#ffffff',
    borderColor: '#c8d1dc',
    boxShadow: 'none',
  }),
  input: (base) => ({ ...base, color: '#1b2a3d' }),
  singleValue: (base) => ({ ...base, color: '#1b2a3d' }),
  placeholder: (base) => ({ ...base, color: '#5e6b7a' }),
  menu: (base) => ({ ...base, backgroundColor: '#ffffff', border: '1px solid #c8d1dc' }),
  option: (base, state) => ({
    ...base,
    color: state.isSelected ? '#ffffff' : '#1b2a3d',
    backgroundColor: state.isSelected ? '#1d4a8a' : state.isFocused ? '#e4eaf1' : '#ffffff',
  }),
};

export default function CandidaturaPage() {
  const initialVaga = (useLocation().state as LocationState)?.vaga;
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [options, setOptions] = useState<Options>({
    cidadesVaga: [],
    estadosCivis: [],
    etnia: [],
    filiais: [],
    paises: [],
  });
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [bairrosVaga, setBairrosVaga] = useState<BairroVaga[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [finalizada, setFinalizada] = useState(false);
  const [atualizarEndereco, setAtualizarEndereco] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { errors },
    control,
  } = useForm<Form>({
    defaultValues: {
      vagas: initialVaga ? [initialVaga] : [],
      pcd: undefined,
      pretensaoSalarial: '',
      dadosVaga: emptyDadosVaga,
      lojasProximas: [],
      experiencias: [],
      bairrosVaga: [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'experiencias' });

  useEffect(() => {
    api
      .get<Options>('/public/candidatos/opcoes')
      .then(({ data }) => setOptions(data))
      .catch(() => setMessage('Não foi possível carregar as opções do formulário.'));
  }, []);

  const estadoEndereco = watch('estadoEndereco');
  const cidadeVagaId = watch('cidadeVagaId');
  const indicadoFuncionario = watch('dadosVaga.indicadoFuncionario');
  const parenteEmpresa = watch('dadosVaga.parenteEmpresa');
  const aposentado = watch('dadosVaga.aposentado');
  useEffect(() => {
    const brasil = options.paises.find((pais) => /^brasil$/i.test(pais.NOMPAI.trim()));
    if (!brasil) return;
    api
      .get<Estado[]>(`/public/candidatos/paises/${brasil.CODPAI}/estados`)
      .then(({ data }) => setEstados(data))
      .catch(() => setEstados([]));
  }, [options.paises]);
  useEffect(() => {
    const brasil = options.paises.find((pais) => /^brasil$/i.test(pais.NOMPAI.trim()));
    if (!brasil || !estadoEndereco) {
      setCidades([]);
      return;
    }
    api
      .get<Cidade[]>(`/public/candidatos/paises/${brasil.CODPAI}/estados/${estadoEndereco}/cidades`)
      .then(({ data }) => setCidades(data))
      .catch(() => setCidades([]));
  }, [estadoEndereco, options.paises]);
  useEffect(() => {
    if (!cidadeVagaId) {
      setBairrosVaga([]);
      setValue('bairrosVaga', []);
      return;
    }
    setValue('bairrosVaga', []);
    api
      .get<BairroVaga[]>(`/public/candidatos/cidades-vaga/${cidadeVagaId}/bairros`)
      .then(({ data }) => setBairrosVaga(data))
      .catch(() => setBairrosVaga([]));
  }, [cidadeVagaId, setValue]);

  const consultarCpf = async () => {
    const cpf = cpfDigits(getValues('cpf'));
    if (cpf.length !== 11) {
      setError('cpf', { message: 'Informe os 11 dígitos do CPF' });
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post<Candidate | null>('/public/candidatos/consultar', { cpf });
      setCandidate(data);
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'dadosVaga' || key === 'lojasProximas' || key === 'experiencias') return;
          setValue(
            key as keyof Form,
            key === 'dataNascimento'
              ? (String(value).slice(0, 10) as never)
              : (String(value ?? '') as never),
          );
        });
        const dadosVaga = data.dadosVaga as unknown as Omit<
          Partial<DadosVaga>,
          'disponibilidadeHorario' | 'indicadoFuncionario' | 'parenteEmpresa' | 'aposentado'
        > & {
          disponibilidadeHorario?: boolean;
          indicadoFuncionario?: boolean;
          parenteEmpresa?: boolean;
          aposentado?: boolean;
        };
        setValue('dadosVaga', {
          ...emptyDadosVaga,
          ...dadosVaga,
          disponibilidadeHorario:
            typeof dadosVaga?.disponibilidadeHorario === 'boolean'
              ? dadosVaga.disponibilidadeHorario
                ? 'sim'
                : 'nao'
              : (dadosVaga?.disponibilidadeHorario ?? ''),
          indicadoFuncionario:
            typeof dadosVaga?.indicadoFuncionario === 'boolean'
              ? dadosVaga.indicadoFuncionario
                ? 'sim'
                : 'nao'
              : (dadosVaga?.indicadoFuncionario ?? ''),
          parenteEmpresa:
            typeof dadosVaga?.parenteEmpresa === 'boolean'
              ? dadosVaga.parenteEmpresa
                ? 'sim'
                : 'nao'
              : (dadosVaga?.parenteEmpresa ?? ''),
          aposentado:
            typeof dadosVaga?.aposentado === 'boolean'
              ? dadosVaga.aposentado
                ? 'sim'
                : 'nao'
              : (dadosVaga?.aposentado ?? ''),
        });
        setValue(
          'lojasProximas',
          data.lojasProximas?.map((item: { codfil: number }) => String(item.codfil)) ?? [],
        );
        setValue(
          'telefone',
          formatPhone(
            data.numeroTelefone ??
              String(data.telefone ?? '')
                .replace(/\D/g, '')
                .slice(-9),
          ),
        );
        setValue(
          'experiencias',
          (data.experiencias ?? []).map((experiencia) => ({
            ...experiencia,
            admissao: experiencia.admissao ? monthYearFromDate(experiencia.admissao) : '',
            demissao: experiencia.demissao ? monthYearFromDate(experiencia.demissao) : '',
          })),
        );
      }
      setValue('cpf', cpf);
      setEtapa(3);
    } catch {
      setMessage('Não foi possível consultar o CPF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const validar = (campos: (keyof Form)[]) => {
    let valid = true;
    campos.forEach((campo) => {
      const value = getValues(campo);
      if (!value || (typeof value === 'string' && !value.trim())) {
        setError(campo, { message: 'Campo obrigatório' });
        valid = false;
      }
      if (campo === 'dddTelefone' && String(value).replace(/\D/g, '').length !== 2) {
        setError(campo, { message: 'Informe o DDD com 2 dígitos' });
        valid = false;
      }
      if (campo === 'telefone' && String(value).replace(/\D/g, '').length !== 9) {
        setError(campo, { message: 'Informe o telefone com 9 dígitos' });
        valid = false;
      }
    });
    if (campos.includes('email') && !/^\S+@\S+\.\S+$/.test(getValues('email').trim())) {
      setError('email', { message: 'Informe um e-mail válido' });
      valid = false;
    }
    return valid;
  };

  const salvar = async () => {
    const values = getValues();
    if (!values.cidadeVagaId) {
      setError('cidadeVagaId', { message: 'Selecione a cidade da vaga' });
      return;
    }
    if (!values.bairrosVaga.length) {
      setError('bairrosVaga', { message: 'Selecione pelo menos um bairro' });
      return;
    }
    if (
      values.dadosVaga.indicadoFuncionario === 'sim' &&
      !values.dadosVaga.indicadoLojaSetor.trim()
    ) {
      setError('dadosVaga.indicadoLojaSetor', { message: 'Informe a loja ou setor da indicação' });
      return;
    }
    if (values.dadosVaga.parenteEmpresa === 'sim' && !values.dadosVaga.parenteLojaSetor.trim()) {
      setError('dadosVaga.parenteLojaSetor', { message: 'Informe a loja ou setor do parente' });
      return;
    }
    if (values.dadosVaga.aposentado === 'sim' && !values.dadosVaga.aposentadoriaTipo.trim()) {
      setError('dadosVaga.aposentadoriaTipo', { message: 'Informe o tipo de aposentadoria' });
      return;
    }
    if (values.experiencias.some((item) => !item.empresa.trim() || !item.cargo.trim())) {
      setMessage('Preencha empresa e cargo em cada experiência adicionada.');
      return;
    }
    for (const [index, experiencia] of values.experiencias.entries()) {
      if (experiencia.admissao && !monthYearToDate(experiencia.admissao)) {
        setError(`experiencias.${index}.admissao`, {
          message: 'Informe o mês e ano no formato MM/AAAA',
        });
        return;
      }
      if (experiencia.demissao && !monthYearToDate(experiencia.demissao)) {
        setError(`experiencias.${index}.demissao`, {
          message: 'Informe o mês e ano no formato MM/AAAA',
        });
        return;
      }
    }
    setLoading(true);
    setMessage('');
    const dadosVaga = {
      ...values.dadosVaga,
      bairro: values.bairrosVaga.join(', ') || values.dadosVaga.bairro || values.bairroNome,
      disponibilidadeHorario: values.dadosVaga.disponibilidadeHorario
        ? bool(values.dadosVaga.disponibilidadeHorario)
        : undefined,
      indicadoFuncionario: values.dadosVaga.indicadoFuncionario
        ? bool(values.dadosVaga.indicadoFuncionario)
        : undefined,
      parenteEmpresa: values.dadosVaga.parenteEmpresa
        ? bool(values.dadosVaga.parenteEmpresa)
        : undefined,
      aposentado: values.dadosVaga.aposentado ? bool(values.dadosVaga.aposentado) : undefined,
    };
    const payload = uppercaseValues({
      ...values,
      cpf: cpfDigits(values.cpf),
      cidadeVagaId: Number(values.cidadeVagaId),
      raccor: Number(values.raccor),
      telefone: `(${values.dddTelefone}) ${values.telefone}`,
      numeroTelefone: values.telefone.replace(/\D/g, ''),
      pcd: bool(values.pcd),
      dadosVaga,
      lojasProximas: values.lojasProximas.map((codfil) => ({ codfil: Number(codfil) })),
      experiencias: values.experiencias.map((experiencia) => ({
        ...experiencia,
        admissao: monthYearToDate(experiencia.admissao),
        demissao: monthYearToDate(experiencia.demissao),
      })),
    });
    payload.email = values.email.trim();
    try {
      if (candidate)
        await api.post('/public/candidatos/atualizar', { ...payload, atualizarEndereco });
      else await api.post('/public/candidatos', payload);
      setFinalizada(true);
    } catch {
      setMessage('Não foi possível salvar seus dados. Verifique as informações e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const input = (name: keyof Form, label: string, type = 'text', required = true) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-ink">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        inputMode={
          name === 'cpf' || name === 'cep' || name === 'dddTelefone' || name === 'telefone'
            ? 'numeric'
            : undefined
        }
        maxLength={
          name === 'cpf'
            ? 11
            : name === 'cep'
              ? 9
              : name === 'telefone'
                ? 10
                : name === 'dddTelefone'
                  ? 2
                  : undefined
        }
        className="border-hairline bg-surface-1 text-ink"
        {...register(name)}
        onChange={(event) => {
          if (name === 'cpf') event.target.value = cpfDigits(event.target.value);
          if (name === 'cep') event.target.value = formatCep(event.target.value);
          if (name === 'dddTelefone')
            event.target.value = event.target.value.replace(/\D/g, '').slice(0, 2);
          if (name === 'telefone') event.target.value = formatPhone(event.target.value);
          register(name).onChange(event);
          if (name === 'email' && /^\S+@\S+\.\S+$/.test(event.target.value.trim()))
            clearErrors('email');
        }}
      />
      {errors[name] && <p className="text-body-sm text-destructive">{errors[name]?.message}</p>}
    </div>
  );
  const select = (
    name: 'estadoCivil' | 'raccor' | 'grauInstrucao' | 'cidadeVagaId' | 'tipoLogradouro',
    label: string,
    children: ReactNode,
  ) => {
    const selectOptions = Children.toArray(children)
      .flatMap((item) =>
        isValidElement<{ value?: string | number; children?: ReactNode }>(item) && item.props.value
          ? [item]
          : isValidElement<{ children?: ReactNode }>(item)
            ? Children.toArray(item.props.children)
            : [],
      )
      .flatMap((item) =>
        isValidElement<{ value?: string | number; children?: ReactNode }>(item) && item.props.value
          ? [{ value: String(item.props.value), label: String(item.props.children) }]
          : [],
      );
    return (
      <div className="space-y-2">
        <Label htmlFor={name} className="text-ink">
          {label} <span className="text-destructive">*</span>
        </Label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              inputId={name}
              classNamePrefix="public-select"
              styles={publicSelectStyles}
              options={selectOptions}
              value={selectOptions.find((item) => item.value === field.value) ?? null}
              onChange={(item) => field.onChange(item?.value ?? '')}
              placeholder="Selecione"
              noOptionsMessage={() => 'Nenhuma opção'}
            />
          )}
        />
        {errors[name] && <p className="text-body-sm text-destructive">{errors[name]?.message}</p>}
      </div>
    );
  };
  const addressSelect = (
    name: 'estadoEndereco' | 'cidadeNome',
    label: string,
    selectOptions: { value: string; label: string }[],
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-ink">
        {label} <span className="text-destructive">*</span>
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            inputId={name}
            classNamePrefix="public-select"
            styles={publicSelectStyles}
            options={selectOptions}
            value={selectOptions.find((item) => item.value === field.value) ?? null}
            onChange={(item) => {
              field.onChange(item?.value ?? '');
              if (name === 'estadoEndereco') setValue('cidadeNome', '');
            }}
            placeholder="Selecione"
            noOptionsMessage={() => 'Nenhuma opção'}
          />
        )}
      />
      {errors[name] && <p className="text-body-sm text-destructive">{errors[name]?.message}</p>}
    </div>
  );
  const profileSelect = (
    name: `dadosVaga.${keyof DadosVaga}`,
    label: string,
    selectOptions: { value: string; label: string }[],
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            inputId={name}
            classNamePrefix="public-select"
            styles={publicSelectStyles}
            options={selectOptions}
            value={selectOptions.find((item) => item.value === field.value) ?? null}
            onChange={(item) => field.onChange(item?.value ?? '')}
            placeholder="Selecione"
            noOptionsMessage={() => 'Nenhuma opção'}
          />
        )}
      />
    </div>
  );

  return (
    <main className="public-candidatura min-h-screen bg-canvas px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-body-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para vagas
        </Link>
        <Card className="mt-6 border-hairline bg-surface-1">
          <CardHeader className="space-y-4 p-6 sm:p-8">
            <div className="h-1.5 w-16 rounded-full bg-primary" />
            <div>
              <p className="text-eyebrow text-ink-muted">Faça parte do nosso time</p>
              <CardTitle className="mt-2 font-display text-3xl text-ink sm:text-display-md">
                Candidate-se a uma vaga
              </CardTitle>
              <CardDescription className="mt-3">
                Preencha seus dados para demonstrar interesse nas oportunidades do Coelho Diniz.
              </CardDescription>
            </div>
            <ol className="grid grid-cols-4 gap-2 border-t border-hairline pt-5">
              {['Vagas', 'CPF', 'Dados', 'Perfil'].map((label, index) => (
                <li
                  key={label}
                  className={`text-caption ${index + 1 <= etapa ? 'font-medium text-ink' : 'text-ink-tertiary'}`}
                >
                  <span
                    className={`mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${index + 1 <= etapa ? 'bg-primary text-primary-foreground' : 'border border-hairline'}`}
                  >
                    {index + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </li>
              ))}
            </ol>
          </CardHeader>
          <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
            {finalizada ? (
              <div className="border-t border-hairline pt-8 text-center">
                <CircleCheck className="mx-auto h-12 w-12 text-report-green" />
                <h2 className="mt-4 font-display text-headline text-ink">
                  Dados salvos com sucesso
                </h2>
                <p className="mt-3 text-body text-ink-muted">
                  Seu cadastro está disponível para nossa equipe.
                </p>
                <Button asChild className="mt-6">
                  <Link to="/">Voltar para vagas</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(() => void salvar())} noValidate>
                {etapa === 1 && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="font-display text-card-title text-ink">Vagas de interesse</h2>
                      <p className="mt-1 text-body-sm text-ink-muted">
                        Selecione uma ou mais oportunidades.
                      </p>
                    </div>
                    <fieldset>
                      <legend className="text-body font-medium text-ink">
                        Quais vagas interessam a você? <span className="text-destructive">*</span>
                      </legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {vagas.map((vaga) => (
                          <label
                            key={vaga}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-hairline px-3 text-body-sm text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                          >
                            <input
                              type="checkbox"
                              value={vaga}
                              className="h-4 w-4 accent-primary"
                              {...register('vagas')}
                            />
                            {vaga}
                          </label>
                        ))}
                      </div>
                      {errors.vagas && (
                        <p className="text-body-sm text-destructive">
                          Selecione pelo menos uma vaga.
                        </p>
                      )}
                    </fieldset>
                    <fieldset>
                      <legend className="text-body font-medium text-ink">
                        Você é pessoa com deficiência (PCD)?{' '}
                        <span className="text-destructive">*</span>
                      </legend>
                      <div className="mt-3 flex gap-3">
                        {(['sim', 'nao'] as const).map((value) => (
                          <label
                            key={value}
                            className="flex min-w-24 cursor-pointer items-center gap-2 rounded-md border border-hairline px-4 py-3 text-body-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                          >
                            <input type="radio" value={value} {...register('pcd')} />
                            {value === 'sim' ? 'Sim' : 'Não'}
                          </label>
                        ))}
                      </div>
                      {errors.pcd && (
                        <p className="text-body-sm text-destructive">Informe uma opção.</p>
                      )}
                    </fieldset>
                    <div className="space-y-2">
                      <Label htmlFor="pretensaoSalarial" className="text-ink-muted">
                        Pretensão salarial (opcional)
                      </Label>
                      <Input
                        id="pretensaoSalarial"
                        inputMode="decimal"
                        className="border-hairline bg-surface-1 text-ink"
                        {...register('pretensaoSalarial', {
                          onChange: (event) =>
                            setValue('pretensaoSalarial', money(event.target.value)),
                        })}
                      />
                    </div>
                    <div className="flex justify-end border-t border-hairline pt-6">
                      <Button
                        type="button"
                        onClick={() => {
                          const hasVagas = getValues('vagas').length > 0;
                          const hasPcd = Boolean(getValues('pcd'));
                          if (!hasVagas) setError('vagas', { message: 'Obrigatório' });
                          if (!hasPcd) setError('pcd', { message: 'Obrigatório' });
                          if (hasVagas && hasPcd) setEtapa(2);
                        }}
                      >
                        Continuar <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </section>
                )}
                {etapa === 2 && (
                  <section className="space-y-6">
                    <div>
                      <h2 className="font-display text-card-title text-ink">Dados pessoais</h2>
                      <p className="mt-1 text-body-sm text-ink-muted">
                        Informe seu CPF para consultar seu cadastro.
                      </p>
                    </div>
                    {input('cpf', 'CPF')}
                    <div className="flex justify-between border-t border-hairline pt-6">
                      <Button type="button" variant="outline" onClick={() => setEtapa(1)}>
                        <ArrowLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button type="button" onClick={() => void consultarCpf()} disabled={loading}>
                        {loading ? 'Consultando...' : 'Continuar'}{' '}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </section>
                )}
                {etapa === 3 && (
                  <section className="space-y-5">
                    <div>
                      <h2 className="font-display text-card-title text-ink">
                        {candidate ? 'Atualize seus contatos' : 'Complete seus dados pessoais'}
                      </h2>
                      <p className="mt-1 text-body-sm text-ink-muted">
                        {candidate
                          ? 'E-mail e telefone podem ser atualizados. O endereço é opcional.'
                          : 'Preencha as informações necessárias para criar seu cadastro.'}
                      </p>
                    </div>
                    {!candidate && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">{input('nome', 'Nome completo')}</div>
                        {input('dataNascimento', 'Data de nascimento', 'date')}
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {input('email', 'E-mail', 'email')}
                      <div className="grid grid-cols-[100px_1fr] gap-3">
                        {input('dddTelefone', 'DDD', 'tel')}
                        {input('telefone', 'Telefone', 'tel')}
                      </div>
                    </div>
                    {!candidate && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {select(
                          'estadoCivil',
                          'Estado civil',
                          options.estadosCivis.map((item) => (
                            <option key={item.KEYNAM} value={item.KEYNAM}>
                              {item.VALKEY}
                            </option>
                          )),
                        )}
                        {select(
                          'raccor',
                          'Raça/Cor',
                          options.etnia.map((item) => (
                            <option key={item.CODETN} value={item.CODETN}>
                              {item.DESETN}
                            </option>
                          )),
                        )}
                        {select(
                          'grauInstrucao',
                          'Escolaridade',
                          graus.map((item) => (
                            <option key={item.cod} value={item.cod}>
                              {item.desc}
                            </option>
                          )),
                        )}
                      </div>
                    )}
                    {candidate && (
                      <label className="flex items-center gap-3 text-body-sm text-ink">
                        <input
                          type="checkbox"
                          checked={atualizarEndereco}
                          onChange={(event) => setAtualizarEndereco(event.target.checked)}
                        />{' '}
                        Quero atualizar meu endereço
                      </label>
                    )}
                    {(!candidate || atualizarEndereco) && (
                      <div className="grid gap-4 border-t border-hairline pt-5 sm:grid-cols-2">
                        {input('cep', 'CEP')}
                        {addressSelect(
                          'estadoEndereco',
                          'Estado',
                          estados.map((item) => ({ value: item.CODEST, label: item.DESEST })),
                        )}
                        {addressSelect(
                          'cidadeNome',
                          'Cidade',
                          cidades.map((item) => ({ value: item.NOMCID, label: item.NOMCID })),
                        )}
                        {input('bairroNome', 'Bairro')}
                        {select(
                          'tipoLogradouro',
                          'Tipo de logradouro',
                          <>
                            <option value="AV">AV - Avenida</option>
                            <option value="R">R - Rua</option>
                            <option value="PC">PC - Praça</option>
                            <option value="ROD">ROD - Rodovia</option>
                            <option value="VLA">VLA - Vila</option>
                            <option value="COND">COND - Condomínio</option>
                            <option value="SIT">SIT - Sítio</option>
                            <option value="BL">BL - Bloco</option>
                            <option value="O">O - Outros</option>
                          </>,
                        )}
                        <div className="sm:col-span-2">{input('endereco', 'Endereço')}</div>
                        {input('numero', 'Número')}
                        {input('complemento', 'Complemento', 'text', false)}
                      </div>
                    )}
                    <div className="flex justify-between border-t border-hairline pt-6">
                      <Button type="button" variant="outline" onClick={() => setEtapa(2)}>
                        <ArrowLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          const fields = candidate
                            ? ['email', 'dddTelefone', 'telefone']
                            : [
                                'nome',
                                'dataNascimento',
                                'email',
                                'dddTelefone',
                                'telefone',
                                'estadoCivil',
                                'raccor',
                                'grauInstrucao',
                                'cep',
                                'estadoEndereco',
                                'cidadeNome',
                                'bairroNome',
                                'tipoLogradouro',
                                'endereco',
                                'numero',
                              ];
                          if (validar(fields as (keyof Form)[])) setEtapa(4);
                        }}
                      >
                        Continuar <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </section>
                )}
                {etapa === 4 && (
                  <section className="space-y-7">
                    <div>
                      <h2 className="font-display text-card-title text-ink">Perfil profissional</h2>
                      <p className="mt-1 text-body-sm text-ink-muted">
                        Conte-nos sobre sua disponibilidade e experiências.
                      </p>
                    </div>
                    <fieldset className="grid gap-4 sm:grid-cols-2">
                      {profileSelect('dadosVaga.estudoHorario', 'Horário de estudo', [
                        { value: 'NAO', label: 'Não' },
                        { value: 'MANHA', label: 'Manhã' },
                        { value: 'TARDE', label: 'Tarde' },
                        { value: 'NOITE', label: 'Noite' },
                      ])}
                      {profileSelect('dadosVaga.conducaoPropria', 'Condução própria', [
                        { value: 'NAO', label: 'Não' },
                        { value: 'BICICLETA', label: 'Bicicleta' },
                        { value: 'MOTO', label: 'Moto' },
                        { value: 'CARRO', label: 'Carro' },
                      ])}
                      <div className="space-y-2">
                        <Label htmlFor="nomePai" className="text-ink">
                          Nome do pai
                        </Label>
                        <Input
                          id="nomePai"
                          className="border-hairline bg-surface-1 text-ink"
                          {...register('dadosVaga.nomePai')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nomeMae" className="text-ink">
                          Nome da mãe
                        </Label>
                        <Input
                          id="nomeMae"
                          className="border-hairline bg-surface-1 text-ink"
                          {...register('dadosVaga.nomeMae')}
                        />
                      </div>
                      {profileSelect(
                        'dadosVaga.disponibilidadeHorario',
                        'Possui disponibilidade de horário?',
                        [
                          { value: 'sim', label: 'Sim' },
                          { value: 'nao', label: 'Não' },
                        ],
                      )}
                      <div />
                      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                        {profileSelect(
                          'dadosVaga.indicadoFuncionario',
                          'Foi indicado por funcionário?',
                          [
                            { value: 'sim', label: 'Sim' },
                            { value: 'nao', label: 'Não' },
                          ],
                        )}
                        {indicadoFuncionario === 'sim' && (
                          <div className="space-y-2">
                            <Label htmlFor="indicadoLojaSetor" className="text-ink">
                              Loja/setor da indicação <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="indicadoLojaSetor"
                              className="border-hairline bg-surface-1 text-ink"
                              {...register('dadosVaga.indicadoLojaSetor')}
                            />
                            {errors.dadosVaga?.indicadoLojaSetor && (
                              <p className="text-body-sm text-destructive">
                                {errors.dadosVaga.indicadoLojaSetor.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                        {profileSelect('dadosVaga.parenteEmpresa', 'Possui parente na empresa?', [
                          { value: 'sim', label: 'Sim' },
                          { value: 'nao', label: 'Não' },
                        ])}
                        {parenteEmpresa === 'sim' && (
                          <div className="space-y-2">
                            <Label htmlFor="parenteLojaSetor" className="text-ink">
                              Loja/setor do parente <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="parenteLojaSetor"
                              className="border-hairline bg-surface-1 text-ink"
                              {...register('dadosVaga.parenteLojaSetor')}
                            />
                            {errors.dadosVaga?.parenteLojaSetor && (
                              <p className="text-body-sm text-destructive">
                                {errors.dadosVaga.parenteLojaSetor.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {parenteEmpresa === 'sim' && (
                        <div className="space-y-2">
                          <Label htmlFor="parenteNome" className="text-ink">
                            Nome do parente
                          </Label>
                          <Input
                            id="parenteNome"
                            className="border-hairline bg-surface-1 text-ink"
                            {...register('dadosVaga.parenteNome')}
                          />
                        </div>
                      )}
                      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                        {profileSelect('dadosVaga.aposentado', 'É aposentado?', [
                          { value: 'sim', label: 'Sim' },
                          { value: 'nao', label: 'Não' },
                        ])}
                        {aposentado === 'sim' && (
                          <div className="space-y-2">
                            <Label htmlFor="aposentadoriaTipo" className="text-ink">
                              Tipo de aposentadoria <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="aposentadoriaTipo"
                              className="border-hairline bg-surface-1 text-ink"
                              {...register('dadosVaga.aposentadoriaTipo')}
                            />
                            {errors.dadosVaga?.aposentadoriaTipo && (
                              <p className="text-body-sm text-destructive">
                                {errors.dadosVaga.aposentadoriaTipo.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </fieldset>
                    <fieldset className="grid gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
                      <legend className="font-display text-card-title text-ink">
                        Selecione as lojas próximas a você
                      </legend>
                      <p className="sm:col-span-2 text-body-sm text-ink-muted">
                        Escolha uma cidade próxima e um ou mais bairros disponíveis.
                      </p>
                      {select(
                        'cidadeVagaId',
                        'Cidade próxima',
                        options.cidadesVaga.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        )),
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="bairrosVaga" className="text-ink">
                          Bairros <span className="text-destructive">*</span>
                        </Label>
                        {cidadeVagaId ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {bairrosVaga.map((bairro) => (
                              <label
                                key={`${bairro.CODFIL}-${bairro.CODBAI}`}
                                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-hairline bg-surface-1 px-3 text-body-sm text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                              >
                                <input
                                  type="checkbox"
                                  value={bairro.NOMBAI}
                                  className="h-4 w-4 accent-primary"
                                  {...register('bairrosVaga')}
                                />
                                {formatBairro(bairro.NOMBAI)}
                              </label>
                            ))}
                            {!bairrosVaga.length && (
                              <p className="text-body-sm text-ink-muted">
                                Nenhum bairro encontrado.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-body-sm text-ink-muted">
                            Selecione a cidade primeiro.
                          </p>
                        )}
                        {errors.bairrosVaga && (
                          <p className="text-body-sm text-destructive">
                            {errors.bairrosVaga.message}
                          </p>
                        )}
                      </div>
                    </fieldset>
                    <section className="border-t border-hairline pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-display text-card-title text-ink">
                            Experiência profissional
                          </h3>
                          <p className="mt-1 text-body-sm text-ink-muted">
                            Adicione as empresas em que já trabalhou.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append(emptyExperiencia)}
                        >
                          <Plus className="h-4 w-4" /> Adicionar
                        </Button>
                      </div>
                      <div className="mt-4 space-y-4">
                        {fields.map((field, index) => (
                          <div key={field.id} className="rounded-lg border border-hairline p-4">
                            <div className="flex justify-between">
                              <p className="text-body-sm font-medium text-ink">
                                Experiência {index + 1}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                aria-label="Remover experiência"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Input
                                placeholder="Empresa"
                                className="border-hairline bg-surface-1 text-ink"
                                {...register(`experiencias.${index}.empresa`)}
                              />
                              <Input
                                placeholder="Cargo"
                                className="border-hairline bg-surface-1 text-ink"
                                {...register(`experiencias.${index}.cargo`)}
                              />
                              <div className="space-y-1">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  aria-label="Data de admissão"
                                  placeholder="MM/AAAA"
                                  maxLength={7}
                                  className="border-hairline bg-surface-1 text-ink"
                                  {...register(`experiencias.${index}.admissao`, {
                                    onChange: (event) => {
                                      event.target.value = formatMonthYear(event.target.value);
                                      clearErrors(`experiencias.${index}.admissao`);
                                    },
                                  })}
                                />
                                {errors.experiencias?.[index]?.admissao && (
                                  <p className="text-body-sm text-destructive">
                                    {errors.experiencias[index].admissao.message}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  aria-label="Data de demissão"
                                  placeholder="MM/AAAA"
                                  maxLength={7}
                                  className="border-hairline bg-surface-1 text-ink"
                                  {...register(`experiencias.${index}.demissao`, {
                                    onChange: (event) => {
                                      event.target.value = formatMonthYear(event.target.value);
                                      clearErrors(`experiencias.${index}.demissao`);
                                    },
                                  })}
                                />
                                {errors.experiencias?.[index]?.demissao && (
                                  <p className="text-body-sm text-destructive">
                                    {errors.experiencias[index].demissao.message}
                                  </p>
                                )}
                              </div>
                              <Input
                                placeholder="Motivo de saída"
                                className="border-hairline bg-surface-1 text-ink sm:col-span-2"
                                {...register(`experiencias.${index}.motivoSaida`)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                    {message && <p className="text-body-sm text-destructive">{message}</p>}
                    <div className="flex justify-between border-t border-hairline pt-6">
                      <Button type="button" variant="outline" onClick={() => setEtapa(3)}>
                        <ArrowLeft className="h-4 w-4" /> Voltar
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar cadastro'} <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </section>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
