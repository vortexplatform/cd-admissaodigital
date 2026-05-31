import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select, { type StylesConfig } from 'react-select';
import AsyncSelect from 'react-select/async';
import {
  BriefcaseBusiness,
  CalendarDays,
  Edit3,
  Eye,
  Plus,
  Trash2,
  UserRoundPlus,
  X,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import {
  type Candidatura,
  type Requisicao,
  type StatusCandidatura,
  formatCpf,
  labels,
  optionalNumber,
  statusCandidaturaList,
  toDateInputValue,
} from './requisicoes.model';

const statusTone: Record<string, string> = {
  RASCUNHO: 'border-slate-300 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  ABERTA: 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  AGUARDANDO_CANDIDATO: 'border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  EM_ADMISSAO: 'border-sky-300 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  CANCELADA: 'border-red-300 bg-red-500/10 text-red-700 dark:text-red-200',
  REPROVADA: 'border-red-300 bg-red-500/10 text-red-700 dark:text-red-200',
  ERRO_INTEGRACAO: 'border-red-300 bg-red-500/10 text-red-700 dark:text-red-200',
};

interface SelectOption {
  value: string;
  label: string;
}

interface CandidatoSearchOption extends SelectOption {
  candidato: {
    id: number;
    nome: string | null;
    cpf: string;
    email: string | null;
    telefone: string | null;
  };
}

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
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

const uniqueOptions = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))))
    .sort((first, second) => first.localeCompare(second, 'pt-BR'))
    .map((value) => ({ value, label: value }));

export default function RequisicoesPage() {
  const navigate = useNavigate();
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [filialFilter, setFilialFilter] = useState<SelectOption | null>(null);
  const [cargoFilter, setCargoFilter] = useState<SelectOption | null>(null);
  const [setorFilter, setSetorFilter] = useState<SelectOption | null>(null);
  const [linkModalRequisicao, setLinkModalRequisicao] = useState<Requisicao | null>(null);
  const [selectedCandidato, setSelectedCandidato] = useState<CandidatoSearchOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [removingCandidaturaId, setRemovingCandidaturaId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const candidateSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filialOptions = uniqueOptions(requisicoes.map((requisicao) => requisicao.filialNome));
  const cargoOptions = uniqueOptions(requisicoes.map((requisicao) => requisicao.cargoNome));
  const setorOptions = uniqueOptions(requisicoes.map((requisicao) => requisicao.ccustoNome));
  const filteredRequisicoes = requisicoes.filter((requisicao) => {
    if (filialFilter && requisicao.filialNome !== filialFilter.value) return false;
    if (cargoFilter && requisicao.cargoNome !== cargoFilter.value) return false;
    if (setorFilter && requisicao.ccustoNome !== setorFilter.value) return false;

    return true;
  });
  const hasActiveFilters = Boolean(filialFilter || cargoFilter || setorFilter);

  const loadData = async () => {
    const requisicoesResponse = await api.get<Requisicao[]>('/requisicoes');
    setRequisicoes(requisicoesResponse.data);
  };

  useEffect(() => {
    loadData()
      .catch(() => setError('Não foi possível carregar as requisições.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(
    () => () => {
      if (candidateSearchTimeout.current) clearTimeout(candidateSearchTimeout.current);
    },
    [],
  );

  const removeRequisicao = async (requisicao: Requisicao) => {
    const title = requisicao.cargoNome ?? requisicao.cargo ?? `#${requisicao.id}`;
    const confirmed = window.confirm(`Excluir a requisição "${title}"?`);
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/requisicoes/${requisicao.id}`);
      await loadData();
    } catch {
      setError('Não foi possível excluir a requisição.');
    }
  };

  const openLinkModal = (requisicao: Requisicao) => {
    setLinkModalRequisicao(requisicao);
    setSelectedCandidato(null);
    setModalError('');
  };

  const closeLinkModal = () => {
    if (isLinking) return;
    setLinkModalRequisicao(null);
    setSelectedCandidato(null);
    setModalError('');
  };

  const loadCandidateOptions = (
    inputValue: string,
    callback: (options: CandidatoSearchOption[]) => void,
  ) => {
    if (candidateSearchTimeout.current) clearTimeout(candidateSearchTimeout.current);

    const nome = inputValue.trim();
    if (nome.length < 3) {
      callback([]);
      return;
    }

    candidateSearchTimeout.current = setTimeout(() => {
      api
        .get<CandidatoSearchOption['candidato'][]>('/candidatos/search', {
          params: { nome, limit: 20 },
        })
        .then(({ data }) => {
          callback(
            data.map((candidato) => ({
              value: String(candidato.id),
              label: `${candidato.nome || formatCpf(candidato.cpf)} · ${formatCpf(candidato.cpf)}`,
              candidato,
            })),
          );
        })
        .catch(() => callback([]));
    }, 350);
  };

  const vincularCandidato = async () => {
    if (!linkModalRequisicao || !selectedCandidato) return;

    const candidatoId = optionalNumber(selectedCandidato.value);
    if (!candidatoId) return;

    setModalError('');
    setIsLinking(true);
    try {
      await api.post(`/requisicoes/${linkModalRequisicao.id}/candidaturas`, { candidatoId });
      await loadData();
      setLinkModalRequisicao(null);
      setSelectedCandidato(null);
    } catch {
      setModalError('Não foi possível vincular o candidato à requisição.');
    } finally {
      setIsLinking(false);
    }
  };

  const atualizarStatusCandidatura = async (
    candidatura: Candidatura,
    status: StatusCandidatura,
  ) => {
    setError('');
    try {
      await api.patch(`/candidaturas/${candidatura.id}/status`, { status });
      await loadData();
    } catch {
      setError('Não foi possível atualizar a candidatura.');
    }
  };

  const removerVinculoCandidato = async (candidatura: Candidatura) => {
    const title = candidatura.candidato.nome || formatCpf(candidatura.candidato.cpf);
    const confirmed = window.confirm(`Remover o vínculo do candidato "${title}" desta requisição?`);
    if (!confirmed) return;

    setError('');
    setRemovingCandidaturaId(candidatura.id);
    try {
      await api.delete(`/candidaturas/${candidatura.id}`);
      await loadData();
    } catch {
      setError('Não foi possível remover o vínculo do candidato.');
    } finally {
      setRemovingCandidaturaId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Mesa de contratação"
        title="Requisições em operação"
        description="Uma lista de controle para abrir vagas, despachar candidatos e acompanhar cada admissão sem entrar no formulário por padrão."
        actions={
          <Button onClick={() => navigate('/requisicoes/novo')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nova requisição
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-[1.75rem] border bg-card p-4 shadow-corporate sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,hsl(var(--accent)/0.16),transparent_24rem),linear-gradient(135deg,hsl(var(--primary)/0.06),transparent_36rem)]" />
        <div className="relative">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Requisições" value={requisicoes.length} />
            <MetricCard
              label="Vagas abertas"
              value={requisicoes.reduce((total, item) => total + item.quantidadeVagas, 0)}
            />
            <MetricCard
              label="Candidaturas"
              value={requisicoes.reduce((total, item) => total + item.candidaturas.length, 0)}
            />
          </div>

          {requisicoes.length > 0 && (
            <div className="mb-5 rounded-2xl border bg-background/80 p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Filtros de operação
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Refine a fila por filial, cargo e setor.
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilialFilter(null);
                      setCargoFilter(null);
                      setSetorFilter(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                )}
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <FilterSelect
                  label="Filial"
                  options={filialOptions}
                  value={filialFilter}
                  onChange={setFilialFilter}
                />
                <FilterSelect
                  label="Cargo"
                  options={cargoOptions}
                  value={cargoFilter}
                  onChange={setCargoFilter}
                />
                <FilterSelect
                  label="Setor"
                  options={setorOptions}
                  value={setorFilter}
                  onChange={setSetorFilter}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Exibindo {filteredRequisicoes.length} de {requisicoes.length} requisição(ões).
              </p>
            </div>
          )}

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Carregando requisições...
              </CardContent>
            </Card>
          ) : requisicoes.length === 0 ? (
            <EmptyState onCreate={() => navigate('/requisicoes/novo')} />
          ) : filteredRequisicoes.length === 0 ? (
            <Card className="border-dashed bg-background/85 text-center">
              <CardContent className="p-8">
                <p className="font-semibold">Nenhuma requisição encontrada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste os filtros para voltar a visualizar a fila.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequisicoes.map((requisicao, index) => (
                <article
                  key={requisicao.id}
                  className="group grid gap-4 rounded-2xl border bg-background/92 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)_minmax(20rem,0.9fr)]"
                  style={{ animation: `fade-slide-up 420ms ease ${index * 45}ms both` }}
                >
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Req #{requisicao.id}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[requisicao.status] ?? 'border-blue-300 bg-blue-500/10 text-blue-700 dark:text-blue-200'}`}
                      >
                        {labels[requisicao.status]}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight">
                      {requisicao.cargoNome ?? requisicao.cargo ?? 'Cargo não informado'}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {labels[requisicao.tipo]} · {requisicao.quantidadeVagas} vaga(s)
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span>{requisicao.empresa?.nome ?? 'Empresa não vinculada'}</span>
                      <span>{requisicao.filialNome ?? 'Filial não informada'}</span>
                      <span>{requisicao.postoTrabalhoNome ?? 'Posto não informado'}</span>
                      <span>{requisicao.ccustoNome ?? 'Centro de custo não informado'}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {toDateInputValue(requisicao.dataPrevistaAdmissao) || 'Sem data prevista'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed bg-muted/35 p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Candidatos
                    </p>
                    {requisicao.candidaturas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum candidato vinculado.</p>
                    ) : (
                      <div className="space-y-2">
                        {requisicao.candidaturas.map((candidatura) => (
                          <div key={candidatura.id} className="rounded-xl border bg-background p-2">
                            <p className="text-sm font-semibold">
                              {candidatura.candidato.nome || formatCpf(candidatura.candidato.cpf)}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <select
                                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
                                value={candidatura.status}
                                onChange={(event) =>
                                  atualizarStatusCandidatura(
                                    candidatura,
                                    event.target.value as StatusCandidatura,
                                  )
                                }
                              >
                                {statusCandidaturaList.map((status) => (
                                  <option key={status} value={status}>
                                    {labels[status]}
                                  </option>
                                ))}
                              </select>
                              {candidatura.status === 'INSCRITO' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                  disabled={removingCandidaturaId === candidatura.id}
                                  onClick={() => removerVinculoCandidato(candidatura)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remover
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-center"
                      onClick={() => openLinkModal(requisicao)}
                    >
                      <UserRoundPlus className="h-4 w-4" />
                      Vincular candidato
                    </Button>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/requisicoes/${requisicao.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/requisicoes/${requisicao.id}/editar`)}
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeRequisicao(requisicao)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {linkModalRequisicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border bg-background shadow-2xl">
            <div className="border-b bg-muted/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Vincular candidato
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">
                    {linkModalRequisicao.cargoNome ??
                      linkModalRequisicao.cargo ??
                      'Cargo não informado'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Req #{linkModalRequisicao.id} · {labels[linkModalRequisicao.tipo]} ·{' '}
                    {linkModalRequisicao.quantidadeVagas} vaga(s)
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={closeLinkModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground sm:grid-cols-2">
                <span>{linkModalRequisicao.empresa?.nome ?? 'Empresa não vinculada'}</span>
                <span>{linkModalRequisicao.filialNome ?? 'Filial não informada'}</span>
                <span>{linkModalRequisicao.postoTrabalhoNome ?? 'Posto não informado'}</span>
                <span>{linkModalRequisicao.ccustoNome ?? 'Centro de custo não informado'}</span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {toDateInputValue(linkModalRequisicao.dataPrevistaAdmissao) ||
                    'Sem data prevista'}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="candidate-search">
                  Buscar candidato por nome
                </label>
                <AsyncSelect<CandidatoSearchOption, false>
                  cacheOptions
                  inputId="candidate-search"
                  loadOptions={loadCandidateOptions}
                  noOptionsMessage={({ inputValue }) =>
                    inputValue.trim().length < 3
                      ? 'Digite ao menos 3 letras para buscar'
                      : 'Nenhum candidato encontrado'
                  }
                  loadingMessage={() => 'Buscando candidatos...'}
                  placeholder="Digite o nome do candidato"
                  styles={selectStyles as unknown as StylesConfig<CandidatoSearchOption, false>}
                  value={selectedCandidato}
                  onChange={setSelectedCandidato}
                />
                <p className="text-xs text-muted-foreground">
                  A busca consulta o servidor sob demanda e retorna até 20 candidatos por vez.
                </p>
              </div>

              {selectedCandidato && (
                <div className="rounded-2xl border bg-muted/35 p-4 text-sm">
                  <p className="font-semibold">
                    {selectedCandidato.candidato.nome || formatCpf(selectedCandidato.candidato.cpf)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    CPF {formatCpf(selectedCandidato.candidato.cpf)}
                    {selectedCandidato.candidato.email
                      ? ` · ${selectedCandidato.candidato.email}`
                      : ''}
                  </p>
                </div>
              )}

              {modalError && <p className="text-sm text-destructive">{modalError}</p>}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t bg-muted/35 p-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeLinkModal} disabled={isLinking}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={vincularCandidato}
                disabled={!selectedCandidato || isLinking}
              >
                {isLinking ? 'Vinculando...' : 'Confirmar vínculo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (option: SelectOption | null) => void;
  options: SelectOption[];
  value: SelectOption | null;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select<SelectOption, false>
        isClearable
        noOptionsMessage={() => 'Nenhuma opção encontrada'}
        options={options}
        placeholder={`Filtrar por ${label.toLocaleLowerCase('pt-BR')}`}
        styles={selectStyles}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed bg-background/85 text-center">
      <CardHeader>
        <BriefcaseBusiness className="mx-auto h-9 w-9 text-muted-foreground" />
        <CardTitle>Nenhuma requisição cadastrada</CardTitle>
        <CardDescription>Crie a primeira vaga para começar a esteira de admissão.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nova requisição
        </Button>
      </CardContent>
    </Card>
  );
}
