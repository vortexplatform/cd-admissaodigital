import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Select, { type StylesConfig } from 'react-select';
import { ArrowLeft, Edit3, Save, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  type Requisicao,
  formatCpf,
  labels,
  optionalNumber,
  optionalString,
  statusList,
  tipos,
  toDateInputValue,
  toText,
} from './requisicoes.model';

const requisicaoSchema = z.object({
  tipo: z.enum(tipos),
  status: z.enum(statusList),
  empresaId: z.string().optional(),
  quantidadeVagas: z.string().trim().min(1, 'Informe a quantidade de vagas'),
  filial: z.string().trim().optional(),
  filialNome: z.string().trim().optional(),
  postoTrabalho: z.string().trim().optional(),
  postoTrabalhoNome: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  cargoNome: z.string().trim().min(1, 'Informe o nome do cargo'),
  salario: z.string().trim().optional(),
  centroCusto: z.string().trim().optional(),
  ccustoNome: z.string().trim().optional(),
  escala: z.string().trim().optional(),
  descricaoEscala: z.string().trim().optional(),
  dataPrevistaAdmissao: z.string().optional(),
  motivoAbertura: z.string().trim().optional(),
  observacao: z.string().trim().optional(),
});

type RequisicaoForm = z.infer<typeof requisicaoSchema>;
type RequisicaoMode = 'create' | 'edit' | 'view';

const defaultValues: RequisicaoForm = {
  tipo: 'NOVA_VAGA',
  status: 'RASCUNHO',
  empresaId: '',
  quantidadeVagas: '1',
  filial: '',
  filialNome: '',
  postoTrabalho: '',
  postoTrabalhoNome: '',
  cargo: '',
  cargoNome: '',
  salario: '',
  centroCusto: '',
  ccustoNome: '',
  escala: '',
  descricaoEscala: '',
  dataPrevistaAdmissao: '',
  motivoAbertura: '',
  observacao: '',
};

const buildPayload = (values: RequisicaoForm) => ({
  tipo: values.tipo,
  status: values.status,
  empresaId: optionalNumber(values.empresaId),
  quantidadeVagas: optionalNumber(values.quantidadeVagas),
  filial: optionalNumber(values.filial),
  filialNome: optionalString(values.filialNome),
  postoTrabalho: optionalString(values.postoTrabalho),
  postoTrabalhoNome: optionalString(values.postoTrabalhoNome),
  cargo: optionalString(values.cargo),
  cargoNome: optionalString(values.cargoNome),
  salario: values.salario?.trim() ? Number(values.salario.replace(',', '.')) : undefined,
  centroCusto: optionalString(values.centroCusto),
  ccustoNome: optionalString(values.ccustoNome),
  escala: optionalString(values.escala),
  descricaoEscala: optionalString(values.descricaoEscala),
  dataPrevistaAdmissao: optionalString(values.dataPrevistaAdmissao),
  motivoAbertura: optionalString(values.motivoAbertura),
  observacao: optionalString(values.observacao),
});

const getTitle = (mode: RequisicaoMode) => {
  if (mode === 'create') return 'Nova requisição';
  if (mode === 'edit') return 'Editar requisição';
  return 'Visualizar requisição';
};

const mapRequisicaoToForm = (requisicao: Requisicao): RequisicaoForm => ({
  tipo: requisicao.tipo,
  status: requisicao.status,
  empresaId: toText(requisicao.empresaId),
  quantidadeVagas: toText(requisicao.quantidadeVagas),
  filial: toText(requisicao.filial),
  filialNome: toText(requisicao.filialNome),
  postoTrabalho: toText(requisicao.postoTrabalho),
  postoTrabalhoNome: toText(requisicao.postoTrabalhoNome),
  cargo: toText(requisicao.cargo),
  cargoNome: toText(requisicao.cargoNome),
  salario: toText(requisicao.salario),
  centroCusto: toText(requisicao.centroCusto),
  ccustoNome: toText(requisicao.ccustoNome),
  escala: toText(requisicao.escala),
  descricaoEscala: toText(requisicao.descricaoEscala),
  dataPrevistaAdmissao: toDateInputValue(requisicao.dataPrevistaAdmissao),
  motivoAbertura: toText(requisicao.motivoAbertura),
  observacao: toText(requisicao.observacao),
});

interface FilialSenior {
  CODFIL: number;
  NOMFIL: string;
}

interface EscalaSenior {
  CODESC: number;
  NOMESC: string;
}

interface PostoTrabalhoSenior {
  POSTRA: string;
  DESRED: string;
}

interface PostoTrabalhoCaracteristicaSenior {
  CODFIL: number;
  NOMFIL: string;
  CODCAR: string;
  TITCAR: string;
  CODCCU: string;
  NOMCCU: string;
}

interface SelectOption {
  value: string;
  label: string;
}

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
    borderRadius: 'calc(var(--radius) - 2px)',
    backgroundColor: 'hsl(var(--background))',
    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
    ':hover': { borderColor: 'hsl(var(--ring))' },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
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

const findOption = (options: SelectOption[], value?: string) =>
  options.find((option) => option.value === value) ?? null;

const getSavedOption = (value: string, label?: string) =>
  value ? { value, label: `${value} - ${label || 'Valor salvo'}` } : null;

export default function RequisicaoFormPage({ mode }: { mode: RequisicaoMode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { empresaAtiva } = useAuth();
  const [filiais, setFiliais] = useState<FilialSenior[]>([]);
  const [escalas, setEscalas] = useState<EscalaSenior[]>([]);
  const [postosTrabalho, setPostosTrabalho] = useState<PostoTrabalhoSenior[]>([]);
  const [requisicao, setRequisicao] = useState<Requisicao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSeniorData, setIsLoadingSeniorData] = useState(true);
  const [isLoadingPostosTrabalho, setIsLoadingPostosTrabalho] = useState(false);
  const [isLoadingCaracteristicas, setIsLoadingCaracteristicas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [seniorError, setSeniorError] = useState('');
  const isViewMode = mode === 'view';
  const empresaSelecionada = requisicao?.empresa ?? empresaAtiva;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequisicaoForm>({ resolver: zodResolver(requisicaoSchema), defaultValues });

  const filialValue = watch('filial');
  const filialNomeValue = watch('filialNome');
  const postoTrabalhoNomeValue = watch('postoTrabalhoNome');
  const descricaoEscalaValue = watch('descricaoEscala');

  const filialOptions = filiais.map((filial) => ({
    value: String(filial.CODFIL),
    label: `${filial.CODFIL} - ${filial.NOMFIL}`,
  }));
  const postoTrabalhoOptions = postosTrabalho.map((postoTrabalho) => ({
    value: postoTrabalho.POSTRA,
    label: `${postoTrabalho.POSTRA} - ${postoTrabalho.DESRED}`,
  }));
  const escalaOptions = escalas.map((escala) => ({
    value: String(escala.CODESC),
    label: `${escala.CODESC} - ${escala.NOMESC}`,
  }));

  useEffect(() => {
    const loadData = async () => {
      if (mode === 'create') {
        return;
      }

      const requisicaoResponse = await api.get<Requisicao>(`/requisicoes/${id}`);
      setRequisicao(requisicaoResponse.data);
      reset(mapRequisicaoToForm(requisicaoResponse.data));
    };

    loadData()
      .catch(() => setError('Não foi possível carregar a requisição.'))
      .finally(() => setIsLoading(false));
  }, [id, mode, reset]);

  useEffect(() => {
    if (mode !== 'create' || !empresaAtiva) return;

    setValue('empresaId', String(empresaAtiva.id));
  }, [empresaAtiva, mode, setValue]);

  useEffect(() => {
    const codigoEmpresaSenior = empresaSelecionada?.codigoEmpresaSenior;
    if (!codigoEmpresaSenior || !filialValue) {
      setPostosTrabalho([]);
      return;
    }

    setIsLoadingPostosTrabalho(true);
    setSeniorError('');
    api
      .get<PostoTrabalhoSenior[]>(`/general/workstation/${codigoEmpresaSenior}/${filialValue}`)
      .then(({ data }) => setPostosTrabalho(data))
      .catch(() => setSeniorError('Não foi possível carregar os postos de trabalho da filial.'))
      .finally(() => setIsLoadingPostosTrabalho(false));
  }, [empresaSelecionada?.codigoEmpresaSenior, filialValue]);

  useEffect(() => {
    const loadSeniorData = async () => {
      const [filiaisResponse, escalasResponse] = await Promise.all([
        api.get<FilialSenior[]>('/general/filial'),
        api.get<EscalaSenior[]>('/general/workschedule'),
      ]);

      setFiliais(filiaisResponse.data);
      setEscalas(escalasResponse.data);
    };

    loadSeniorData()
      .catch(() => setSeniorError('Não foi possível carregar filial e escala do serviço externo.'))
      .finally(() => setIsLoadingSeniorData(false));
  }, []);

  const updateFilial = (value: string) => {
    const filial = filiais.find((item) => String(item.CODFIL) === value);
    setValue('filialNome', filial?.NOMFIL ?? '');
    setValue('postoTrabalho', '');
    setValue('postoTrabalhoNome', '');
  };

  const applyPostoTrabalhoCharacteristics = (caracteristica: PostoTrabalhoCaracteristicaSenior) => {
    setValue('filial', String(caracteristica.CODFIL));
    setValue('filialNome', caracteristica.NOMFIL);
    setValue('cargo', caracteristica.CODCAR);
    setValue('cargoNome', caracteristica.TITCAR);
    setValue('centroCusto', caracteristica.CODCCU);
    setValue('ccustoNome', caracteristica.NOMCCU);
  };

  const updatePostoTrabalho = async (value: string) => {
    const postoTrabalho = postosTrabalho.find((item) => item.POSTRA === value);
    setValue('postoTrabalhoNome', postoTrabalho?.DESRED ?? '');
    if (!value) return;

    setIsLoadingCaracteristicas(true);
    setSeniorError('');
    try {
      const { data } = await api.get<PostoTrabalhoCaracteristicaSenior[]>(
        `/general/workstation/${value}/characteristics`,
      );
      const [caracteristica] = data;
      if (caracteristica) applyPostoTrabalhoCharacteristics(caracteristica);
    } catch {
      setSeniorError('Não foi possível carregar as características do posto de trabalho.');
    } finally {
      setIsLoadingCaracteristicas(false);
    }
  };

  const updateEscala = (value: string) => {
    const escala = escalas.find((item) => String(item.CODESC) === value);
    setValue('descricaoEscala', escala?.NOMESC ?? '');
  };

  const onSubmit = async (values: RequisicaoForm) => {
    if (isViewMode) return;

    setIsSaving(true);
    setError('');
    try {
      if (mode === 'edit') {
        await api.patch(`/requisicoes/${id}`, buildPayload(values));
      } else {
        await api.post('/requisicoes', buildPayload(values));
      }
      navigate('/requisicoes');
    } catch {
      setError('Não foi possível salvar a requisição. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Requisições"
        title={getTitle(mode)}
        description={
          isViewMode
            ? 'Consulte os dados operacionais enviados para a admissão.'
            : 'Preencha os dados da vaga, integração Senior e contexto operacional.'
        }
        actions={
          <Button type="button" variant="outline" onClick={() => navigate('/requisicoes')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      {isLoading ? (
        <Card className="">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando requisição...
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <Card className="">
            <CardHeader>
              <CardTitle>Dados da requisição</CardTitle>
              <CardDescription>
                {isViewMode ? 'Campos em modo leitura.' : 'Campos principais para abrir a vaga.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tipo" id="tipo">
                    <select
                      id="tipo"
                      disabled={isViewMode}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      {...register('tipo')}
                    >
                      {tipos.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {labels[tipo]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status" id="status">
                    <select
                      id="status"
                      disabled={isViewMode}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      {...register('status')}
                    >
                      {statusList.map((status) => (
                        <option key={status} value={status}>
                          {labels[status]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <Field label="Empresa" id="empresaId">
                    <Input
                      id="empresaId"
                      readOnly
                      value={empresaSelecionada?.nome ?? 'Nenhuma empresa ativa'}
                      className="bg-muted/60"
                    />
                    <input type="hidden" {...register('empresaId')} />
                  </Field>
                  <Field label="Vagas" id="quantidadeVagas" error={errors.quantidadeVagas?.message}>
                    <Input
                      id="quantidadeVagas"
                      disabled={isViewMode}
                      type="number"
                      min="1"
                      {...register('quantidadeVagas')}
                    />
                  </Field>
                </div>

                {seniorError && <p className="text-sm text-destructive">{seniorError}</p>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <ReactSelectField label="Filial" id="filial">
                    <Controller
                      control={control}
                      name="filial"
                      render={({ field }) => (
                        <Select<SelectOption, false>
                          inputId="filial"
                          isClearable
                          isDisabled={isViewMode || isLoadingSeniorData}
                          isLoading={isLoadingSeniorData}
                          noOptionsMessage={() => 'Nenhuma filial encontrada'}
                          options={filialOptions}
                          placeholder="Busque por código ou filial"
                          styles={selectStyles}
                          value={
                            findOption(filialOptions, field.value ?? '') ??
                            getSavedOption(field.value ?? '', filialNomeValue)
                          }
                          onChange={(option) => {
                            const value = option?.value ?? '';
                            field.onChange(value);
                            updateFilial(value);
                          }}
                        />
                      )}
                    />
                  </ReactSelectField>
                  <Field label="Nome da filial" id="filialNome">
                    <Input
                      id="filialNome"
                      readOnly
                      disabled={isViewMode}
                      {...register('filialNome')}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ReactSelectField label="Posto de trabalho" id="postoTrabalho">
                    <Controller
                      control={control}
                      name="postoTrabalho"
                      render={({ field }) => (
                        <Select<SelectOption, false>
                          inputId="postoTrabalho"
                          isClearable
                          isDisabled={
                            isViewMode ||
                            isLoadingSeniorData ||
                            isLoadingPostosTrabalho ||
                            !filialValue
                          }
                          isLoading={isLoadingPostosTrabalho}
                          noOptionsMessage={() => 'Nenhum posto encontrado'}
                          options={postoTrabalhoOptions}
                          placeholder={
                            filialValue
                              ? 'Busque por código ou posto'
                              : 'Selecione a filial primeiro'
                          }
                          styles={selectStyles}
                          value={
                            findOption(postoTrabalhoOptions, field.value ?? '') ??
                            getSavedOption(field.value ?? '', postoTrabalhoNomeValue)
                          }
                          onChange={(option) => {
                            const value = option?.value ?? '';
                            field.onChange(value);
                            void updatePostoTrabalho(value);
                          }}
                        />
                      )}
                    />
                  </ReactSelectField>
                  <Field label="Descrição do posto" id="postoTrabalhoNome">
                    <Input
                      id="postoTrabalhoNome"
                      readOnly
                      disabled={isViewMode || isLoadingCaracteristicas}
                      {...register('postoTrabalhoNome')}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Setor" id="ccustoNome">
                    <Input
                      id="ccustoNome"
                      readOnly
                      disabled={isViewMode}
                      placeholder="Preenchido pelo posto de trabalho"
                      {...register('ccustoNome')}
                    />
                    <input type="hidden" {...register('centroCusto')} />
                  </Field>
                  <Field label="Nome do cargo" id="cargoNome" error={errors.cargoNome?.message}>
                    <Input
                      id="cargoNome"
                      readOnly
                      disabled={isViewMode}
                      placeholder="Preenchido pelo posto de trabalho"
                      {...register('cargoNome')}
                    />
                    <input type="hidden" {...register('cargo')} />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ReactSelectField label="Escala" id="escala">
                    <Controller
                      control={control}
                      name="escala"
                      render={({ field }) => (
                        <Select<SelectOption, false>
                          inputId="escala"
                          isClearable
                          isDisabled={isViewMode || isLoadingSeniorData}
                          isLoading={isLoadingSeniorData}
                          noOptionsMessage={() => 'Nenhuma escala encontrada'}
                          options={escalaOptions}
                          placeholder="Busque por código ou escala"
                          styles={selectStyles}
                          value={
                            findOption(escalaOptions, field.value ?? '') ??
                            getSavedOption(field.value ?? '', descricaoEscalaValue)
                          }
                          onChange={(option) => {
                            const value = option?.value ?? '';
                            field.onChange(value);
                            updateEscala(value);
                          }}
                        />
                      )}
                    />
                  </ReactSelectField>
                  <Field label="Descrição da escala" id="descricaoEscala">
                    <Input
                      id="descricaoEscala"
                      readOnly
                      disabled={isViewMode}
                      {...register('descricaoEscala')}
                    />
                  </Field>
                </div>

                <Field label="Salário mensal (opcional)" id="salario">
                  <Input
                    id="salario"
                    disabled={isViewMode}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Ex.: 1850,00"
                    {...register('salario')}
                  />
                </Field>

                <Field label="Admissão prevista" id="dataPrevistaAdmissao">
                  <Input
                    id="dataPrevistaAdmissao"
                    disabled={isViewMode}
                    type="date"
                    {...register('dataPrevistaAdmissao')}
                  />
                </Field>

                <Field label="Motivo abertura" id="motivoAbertura">
                  <Input
                    id="motivoAbertura"
                    disabled={isViewMode}
                    placeholder="Ex.: Substituição por desligamento"
                    {...register('motivoAbertura')}
                  />
                </Field>

                <Field label="Observação" id="observacao">
                  <textarea
                    id="observacao"
                    disabled={isViewMode}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Detalhes adicionais da requisição"
                    {...register('observacao')}
                  />
                </Field>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row">
                  {!isViewMode && (
                    <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Salvando...' : 'Salvar requisição'}
                    </Button>
                  )}
                  {isViewMode && requisicao && (
                    <Button
                      type="button"
                      onClick={() => navigate(`/requisicoes/${requisicao.id}/editar`)}
                      className="w-full sm:w-auto"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar requisição
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="">
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
                <CardDescription>Referência rápida da requisição.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Summary label="Empresa" value={requisicao?.empresa?.nome ?? 'A definir'} />
                <Summary
                  label="Candidaturas"
                  value={`${requisicao?.candidaturas.length ?? 0} vínculo(s)`}
                />
                <Summary
                  label="Criada em"
                  value={requisicao?.createdAt ? toDateInputValue(requisicao.createdAt) : '-'}
                />
              </CardContent>
            </Card>

            {isViewMode && requisicao && <CandidatosVinculadosCard requisicao={requisicao} />}
          </div>
        </section>
      )}
    </>
  );
}

function Field({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ReactSelectField({
  children,
  id,
  label,
}: {
  children: React.ReactNode;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function CandidatosVinculadosCard({ requisicao }: { requisicao: Requisicao }) {
  return (
    <Card className="">
      <CardHeader>
        <CardTitle>Candidatos vinculados</CardTitle>
        <CardDescription>
          {requisicao.candidaturas.length} candidato(s) nesta requisição.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requisicao.candidaturas.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background p-5 text-center text-sm text-muted-foreground">
            <UserRound className="mx-auto h-7 w-7" />
            <p className="mt-2">Nenhum candidato vinculado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requisicao.candidaturas.map((candidatura) => (
              <div key={candidatura.id} className="rounded-xl border bg-background p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {candidatura.candidato.nome || formatCpf(candidatura.candidato.cpf)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      CPF {formatCpf(candidatura.candidato.cpf)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold">
                    {labels[candidatura.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
