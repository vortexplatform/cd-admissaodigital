import { useEffect, useMemo, useState } from 'react';
import { Edit3, Eye, Plus, Trash2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  REPROVADO: 'Reprovado',
  DESISTIU: 'Desistiu',
  CANCELADO: 'Cancelado',
};

const tabs = [
  { key: 'todos', label: 'Todos' },
  { key: 'aguardando', label: 'Aguardando' },
  { key: 'em-analise', label: 'Em análise' },
  { key: 'aprovados', label: 'Aprovados' },
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
  dataPrevistaAdmissao: string | null;
  createdAt: string;
}

interface CandidaturaResumo {
  id: number;
  status: string;
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

export default function CandidatosPage() {
  const navigate = useNavigate();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCandidatos = async () => {
    const { data } = await api.get<Candidato[]>('/candidatos');
    setCandidatos(data);
  };

  useEffect(() => {
    loadCandidatos()
      .catch(() => setError('Não foi possível carregar os candidatos.'))
      .finally(() => setIsLoading(false));
  }, []);

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
      await loadCandidatos();
    } catch {
      setError('Não foi possível excluir o candidato.');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admissão digital"
        title="Candidatos"
        description={`${candidatos.length} ativo(s) · ${counts['em-analise']} em análise · ${counts.aguardando} aguardando ação`}
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
                Empresa, etapa e SLA vêm da candidatura mais recente vinculada.
              </CardDescription>
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
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[2fr_1.4fr_1.6fr_8rem_13rem] gap-4 border-b bg-muted/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Candidato</span>
                  <span>Empresa</span>
                  <span>Etapa</span>
                  <span>SLA</span>
                  <span className="text-right">Ações</span>
                </div>
                <div className="divide-y">
                  {filteredCandidatos.map((candidato) => {
                    const candidatura = getCurrentCandidatura(candidato);
                    const sla = getSla(candidatura);
                    const status = candidatura?.status;
                    const canDelete = candidato.candidaturas.length === 0;

                    return (
                      <div
                        key={candidato.id}
                        className={`grid grid-cols-[2fr_1.4fr_1.6fr_8rem_13rem] gap-4 px-5 py-4 ${
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
                          <p className="font-medium">
                            {candidatura?.requisicao.empresa?.nome ?? 'Sem candidatura'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nascimento: {toDateInputValue(candidato.dataNascimento)}
                          </p>
                        </div>
                        <div className="self-center">
                          <p className="mb-2 text-sm font-medium">
                            {status ? statusLabels[status] : 'Aguardando vínculo'}
                          </p>
                          <div className="h-2.5 rounded-full border bg-background">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${sla.progress}%` }}
                            />
                          </div>
                        </div>
                        <div
                          className={`self-center font-display text-lg font-semibold ${sla.urgent ? 'text-destructive' : ''}`}
                        >
                          {sla.label}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/candidatos/${candidato.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/candidatos/${candidato.id}/editar`)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCandidato(candidato)}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>
    </>
  );
}
