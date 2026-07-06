import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit3,
  Eye,
  FileSignature,
  FileText,
  Plus,
  Trash2,
  UserRound,
  UserRoundMinus,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AsyncSelect from 'react-select/async';
import type { StylesConfig } from 'react-select';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

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

const tabs = [
  { key: 'todos', label: 'Todos' },
  { key: 'aguardando', label: 'Aguardando' },
  { key: 'em-analise', label: 'Em análise' },
  { key: 'aprovados', label: 'Aprovados' },
  { key: 'efetivados', label: 'Efetivados' },
  { key: 'recusados', label: 'Recusados' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

interface Empresa {
  id: number;
  nome: string;
}

interface RequisicaoResumo {
  id: number;
  empresa: Empresa | null;
  postoTrabalho: string | null;
  postoTrabalhoNome: string | null;
  dataPrevistaAdmissao: string | null;
  createdAt: string;
}

interface CandidaturaResumo {
  id: number;
  status: string;
  dataAdmissaoPrevista: string | null;
  requisicao: RequisicaoResumo;
  createdAt: string;
}

interface Candidato {
  id: number;
  cpf: string;
  dataNascimento: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  candidaturas: CandidaturaResumo[];
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
  dataPrevistaAdmissao: string | null;
}

interface SelectOption {
  value: string;
  label: string;
}

interface RequisicaoOption extends SelectOption {
  requisicao: RequisicaoDisponivel;
}

interface PaginatedCandidatosResponse {
  data: Candidato[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const pageSize = 20;

const selectStyles: StylesConfig<SelectOption, false> = {
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

const fetchPaginatedCandidatos = (currentPage: number, nome: string) =>
  api.get<PaginatedCandidatosResponse>('/candidatos', {
    params: {
      page: currentPage,
      limit: pageSize,
      ...(nome ? { nome } : {}),
    },
  });

const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : '');

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`,
  );
};

const getInitials = (candidato: Candidato) => {
  const base = candidato.nome?.trim() || candidato.cpf;
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const getCurrentCandidatura = (candidato: Candidato) => candidato.candidaturas[0] ?? null;

const getTabForStatus = (status?: string): TabKey => {
  if (!status || status === 'INSCRITO') return 'aguardando';
  if (status === 'APROVADO') return 'aprovados';
  if (status === 'EFETIVADO') return 'efetivados';
  if (status === 'REPROVADO' || status === 'CANCELADO' || status === 'DESISTIU') return 'recusados';
  return 'em-analise';
};

const getSla = (candidatura: CandidaturaResumo | null) => {
  if (!candidatura?.requisicao.dataPrevistaAdmissao)
    return { label: '-', urgent: false, progress: 35 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(candidatura.requisicao.dataPrevistaAdmissao);
  dueDate.setHours(0, 0, 0, 0);
  const days = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { label: `${Math.abs(days)}d vencido`, urgent: true, progress: 95 };
  if (days === 0) return { label: 'hoje', urgent: true, progress: 90 };
  return {
    label: `${days}d`,
    urgent: days <= 2,
    progress: Math.max(20, Math.min(85, 90 - days * 8)),
  };
};

const formatRequisicaoOption = (requisicao: RequisicaoDisponivel): RequisicaoOption => ({
  value: String(requisicao.id),
  label: `#${requisicao.id} - ${requisicao.postoTrabalho ?? 'Posto não informado'} - ${requisicao.postoTrabalhoNome ?? requisicao.cargoNome ?? requisicao.cargo ?? 'Descrição não informada'}`,
  requisicao,
});

export default function CandidatosPage() {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: pageSize });
  const [linkModalCandidato, setLinkModalCandidato] = useState<Candidato | null>(null);
  const [selectedRequisicao, setSelectedRequisicao] = useState<RequisicaoOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const requisicaoSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    let isCurrentRequest = true;
    const trimmedNome = debouncedSearchTerm.trim();

    if (trimmedNome && trimmedNome.length < 3) {
      setCandidatos([]);
      setPagination({ total: 0, totalPages: 1, limit: pageSize });
      setIsLoading(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    setIsLoading(true);
    setError('');
    fetchPaginatedCandidatos(page, trimmedNome)
      .then(({ data }) => {
        if (!isCurrentRequest) return;
        setCandidatos(data.data);
        setPagination({ total: data.total, totalPages: data.totalPages, limit: data.limit });
      })
      .catch(() => {
        if (isCurrentRequest) setError('Não foi possível carregar os candidatos.');
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [page, debouncedSearchTerm]);

  useEffect(
    () => () => {
      if (requisicaoSearchTimeout.current) clearTimeout(requisicaoSearchTimeout.current);
    },
    [],
  );

  const counts = useMemo(
    () => ({
      todos: candidatos.length,
      aguardando: candidatos.filter(
        (candidato) => getTabForStatus(getCurrentCandidatura(candidato)?.status) === 'aguardando',
      ).length,
      'em-analise': candidatos.filter(
        (candidato) => getTabForStatus(getCurrentCandidatura(candidato)?.status) === 'em-analise',
      ).length,
      aprovados: candidatos.filter(
        (candidato) => getTabForStatus(getCurrentCandidatura(candidato)?.status) === 'aprovados',
      ).length,
      efetivados: candidatos.filter(
        (candidato) => getTabForStatus(getCurrentCandidatura(candidato)?.status) === 'efetivados',
      ).length,
      recusados: candidatos.filter(
        (candidato) => getTabForStatus(getCurrentCandidatura(candidato)?.status) === 'recusados',
      ).length,
    }),
    [candidatos],
  );

  const filteredCandidatos = candidatos.filter((candidato) => {
    if (activeTab === 'todos') return true;
    return getTabForStatus(getCurrentCandidatura(candidato)?.status) === activeTab;
  });

  const removeCandidato = async (candidato: Candidato) => {
    if (candidato.candidaturas.length > 0) return;

    const title = candidato.nome ?? formatCpf(candidato.cpf);
    const confirmed = window.confirm(`Excluir o candidato "${title}"?`);
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/candidatos/${candidato.id}`);
      const trimmedNome = debouncedSearchTerm.trim();
      const { data } = await fetchPaginatedCandidatos(page, trimmedNome);
      setCandidatos(data.data);
      setPagination({ total: data.total, totalPages: data.totalPages, limit: data.limit });
    } catch {
      setError('Não foi possível excluir o candidato.');
    }
  };

  const desvincularCandidato = async (candidato: Candidato) => {
    const candidatura = getCurrentCandidatura(candidato);
    if (!candidatura) return;

    const title = candidato.nome ?? formatCpf(candidato.cpf);
    const confirmed = window.confirm(`Desvincular o candidato "${title}" desta requisição?`);
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/candidaturas/${candidatura.id}`);
      await reloadCurrentPage();
    } catch {
      setError('Não foi possível desvincular o candidato.');
    }
  };

  const atualizarDataAdmissaoPrevista = async (candidatura: CandidaturaResumo, value: string) => {
    setError('');
    try {
      await api.patch(`/candidaturas/${candidatura.id}/data-admissao-prevista`, {
        dataAdmissaoPrevista: value || null,
      });
      await reloadCurrentPage();
    } catch {
      setError('Não foi possível atualizar a data prevista de admissão.');
    }
  };

  const hasShortSearchTerm = Boolean(searchTerm.trim()) && searchTerm.trim().length < 3;
  const firstItem = pagination.total === 0 ? 0 : (page - 1) * pagination.limit + 1;
  const lastItem = Math.min(page * pagination.limit, pagination.total);

  const reloadCurrentPage = async () => {
    const trimmedNome = debouncedSearchTerm.trim();
    const { data } = await fetchPaginatedCandidatos(page, trimmedNome);
    setCandidatos(data.data);
    setPagination({ total: data.total, totalPages: data.totalPages, limit: data.limit });
  };

  const closeModals = (force = false) => {
    if (isSavingAction && !force) return;

    setLinkModalCandidato(null);
    setSelectedRequisicao(null);
    setModalError('');
  };

  const openLinkModal = (candidato: Candidato) => {
    setLinkModalCandidato(candidato);
    setSelectedRequisicao(null);
    setModalError('');
  };

  const loadRequisicaoOptions = (
    inputValue: string,
    callback: (options: RequisicaoOption[]) => void,
  ) => {
    if (!linkModalCandidato) {
      callback([]);
      return;
    }

    if (requisicaoSearchTimeout.current) clearTimeout(requisicaoSearchTimeout.current);

    requisicaoSearchTimeout.current = setTimeout(() => {
      api
        .get<RequisicaoDisponivel[]>('/requisicoes/disponiveis', {
          params: {
            candidatoId: linkModalCandidato.id,
            limit: 20,
            q: inputValue.trim() || undefined,
          },
        })
        .then(({ data }) => callback(data.map(formatRequisicaoOption)))
        .catch(() => {
          setModalError('Não foi possível carregar as requisições disponíveis.');
          callback([]);
        });
    }, 350);
  };

  const vincularCandidato = async () => {
    if (!linkModalCandidato || !selectedRequisicao) return;

    setIsSavingAction(true);
    setModalError('');
    try {
      await api.post(`/requisicoes/${selectedRequisicao.value}/candidaturas`, {
        candidatoId: linkModalCandidato.id,
      });
      await reloadCurrentPage();
      closeModals(true);
    } catch {
      setModalError('Não foi possível vincular o candidato à requisição.');
    } finally {
      setIsSavingAction(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admissão digital"
        title="Candidatos"
        description={`${pagination.total} candidato(s) encontrado(s) · ${counts['em-analise']} em análise nesta página · ${counts.aguardando} aguardando ação nesta página`}
        actions={
          <Button
            type="button"
            onClick={() => navigate('/candidatos/novo')}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Candidato
          </Button>
        }
      />

      <Card className="overflow-hidden shadow-corporate">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Fila de candidatos</CardTitle>
              <CardDescription>
                Posto de trabalho e etapa vêm da candidatura mais recente vinculada.
              </CardDescription>
            </div>
            <div className="w-full lg:max-w-sm">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar candidato por nome"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Digite ao menos 3 letras para pesquisar por nome.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-xs opacity-75">· {counts[tab.key]}</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>}
          {hasShortSearchTerm && (
            <p className="border-b px-5 py-3 text-sm text-muted-foreground">
              Digite ao menos 3 letras para buscar por nome.
            </p>
          )}
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando candidatos...</p>
          ) : filteredCandidatos.length === 0 ? (
            <div className="m-6 rounded-xl border border-dashed bg-background p-8 text-center">
              <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">Nenhum candidato encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre um candidato ou altere o filtro selecionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[2fr_2fr_1.2fr_1.3fr_20rem] gap-4 border-b bg-muted/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Candidato</span>
                  <span>Posto de trabalho</span>
                  <span>Etapa</span>
                  <span>Admissão prevista</span>
                  <span className="text-right">Ações</span>
                </div>
                <div className="divide-y">
                  {filteredCandidatos.map((candidato) => {
                    const candidatura = getCurrentCandidatura(candidato);
                    const sla = getSla(candidatura);
                    const status = candidatura?.status;
                    const canDelete = candidato.candidaturas.length === 0;
                    const isEfetivado = candidato.candidaturas.some((c) => c.status === 'EFETIVADO');
                    const canVincular = !candidatura && !isEfetivado;
                    const canDesvincular = !!candidatura && status === 'INSCRITO' && !isEfetivado;

                    return (
                      <div
                        key={candidato.id}
                        className={`grid grid-cols-[2fr_2fr_1.2fr_1.3fr_20rem] gap-4 px-5 py-4 ${
                          sla.urgent ? 'bg-yellow-100/70 dark:bg-yellow-950/30' : 'bg-background'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 bg-background font-semibold">
                            {getInitials(candidato)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {candidato.nome || 'Nome não informado'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatCpf(candidato.cpf)} ·{' '}
                              {candidato.email ?? candidato.telefone ?? 'sem contato'}
                            </p>
                          </div>
                        </div>
                        <div className="self-center text-sm">
                          <p className="truncate font-medium">
                            {candidatura?.requisicao.postoTrabalhoNome ??
                              candidatura?.requisicao.postoTrabalho ??
                              'Sem candidatura'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {candidatura
                              ? `Req. #${candidatura.requisicao.id} · ${candidatura.requisicao.empresa?.nome ?? 'Empresa não informada'}`
                              : `Nasc.: ${toDateInputValue(candidato.dataNascimento)}`}
                          </p>
                        </div>
                        <div className="self-center">
                          <p className="text-sm font-medium">
                            {status ? statusLabels[status] : 'Aguardando vínculo'}
                          </p>
                        </div>
                        <div className="self-center">
                          {candidatura && status === 'APROVADO' ? (
                            <Input
                              type="date"
                              value={toDateInputValue(candidatura.dataAdmissaoPrevista)}
                              onChange={(event) =>
                                atualizarDataAdmissaoPrevista(candidatura, event.target.value)
                              }
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {toDateInputValue(candidatura?.dataAdmissaoPrevista ?? null) || '-'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5 self-center">
                          {canVincular && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openLinkModal(candidato)}
                            >
                              <UserRoundPlus className="h-3.5 w-3.5" />
                              Vincular
                            </Button>
                          )}
                          {canDesvincular && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-destructive hover:text-destructive"
                              onClick={() => desvincularCandidato(candidato)}
                            >
                              <UserRoundMinus className="h-3.5 w-3.5" />
                              Desvincular
                            </Button>
                          )}
                          {candidatura && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => navigate(`/candidatos/${candidato.id}/documentos`)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Documentos
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => navigate(`/assinaturas?candidatoId=${candidato.id}`)}
                              >
                                <FileSignature className="h-3.5 w-3.5" />
                                Assinaturas
                              </Button>
                            </>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => navigate(`/candidatos/${candidato.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => navigate(`/candidatos/${candidato.id}/editar`)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => removeCandidato(candidato)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {!isLoading && !hasShortSearchTerm && pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Exibindo {firstItem}-{lastItem} de {pagination.total} candidato(s)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Anterior
                </Button>
                <span className="min-w-24 text-center text-xs font-semibold uppercase tracking-wide">
                  Página {page} de {pagination.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {linkModalCandidato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Vincular a requisição
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  {linkModalCandidato.nome || formatCpf(linkModalCandidato.cpf)}
                </h2>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => closeModals()}>
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
                </div>
              )}
              {modalError && <p className="text-sm text-destructive">{modalError}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-muted/35 p-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeModals()}
                disabled={isSavingAction}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={vincularCandidato}
                disabled={!selectedRequisicao || isSavingAction}
              >
                {isSavingAction ? 'Vinculando...' : 'Confirmar vínculo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
