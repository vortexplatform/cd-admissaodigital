import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReactSelect from 'react-select';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileSignature,
  Loader2,
  PenLine,
  ShieldCheck,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import {
  type AssinaturasCandidatura,
  type DocumentosCandidatura,
  type EnvelopeAssinatura,
  formatCandidaturaTitle,
  getDocumentoAssinaturaRhUrl,
} from './documentos.model';

// ─── tipos para a listagem paginada ─────────────────────────────────────────

type Situacao = 'APROVADOS' | 'PENDENTES' | 'CONCLUIDAS' | 'TODAS';
type Opt = { value: string; label: string };

interface FiltrosResponse {
  filiais: { numero: number; nome: string | null }[];
  setores: string[];
  cargos: string[];
}

interface EnvelopeResumo {
  id: number;
  setor: 'ADM_PESSOAL' | 'SESMT';
  status: string;
}

interface AssinaturaListItem {
  id: number;
  admissao: string | null;
  candidato: { id: number; nome: string | null; cpf: string };
  requisicao: {
    id: number;
    cargo: string | null;
    cargoNome: string | null;
    ccustoNome: string | null;
    filial: number | null;
    dataPrevistaAdmissao: string | null;
    empresa: { nome: string } | null;
  };
  envelopesAssinatura: EnvelopeResumo[];
}

interface ListaResponse {
  data: AssinaturaListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── helpers para a visão de detalhe (candidatoId na query) ─────────────────

const documentosProntosParaAssinatura = (candidatura: DocumentosCandidatura) => {
  const obrigatorios = candidatura.documentos.filter((d) => d.obrigatorio);
  if (obrigatorios.length === 0) return false;
  return obrigatorios.every((d) => d.dispensadoPorId != null || d.status === 'APROVADO');
};

const getEnvelopeStats = (envelopes: EnvelopeAssinatura[]) => {
  const total = envelopes.reduce((sum, e) => sum + e.documentos.length, 0);
  const signed = envelopes.reduce(
    (sum, e) => sum + e.documentos.filter((d) => d.status === 'ASSINADO').length,
    0,
  );
  return { total, signed, pending: total - signed };
};

const envelopeTitle = (setor: string) => (setor === 'ADM_PESSOAL' ? 'Adm Pessoal' : 'SESMT');

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatCandidaturaListItem = (item: AssinaturaListItem) => {
  const cargo = item.requisicao.cargoNome ?? item.requisicao.cargo ?? 'Cargo não informado';
  const setor = item.requisicao.ccustoNome ?? 'Setor não informado';
  const filial = item.requisicao.filial == null ? '--' : String(item.requisicao.filial).padStart(2, '0');
  return `#${item.requisicao.id} - LJ ${filial} - ${setor} - ${cargo}`;
};

const SITUACAO_TABS: { value: Situacao; label: string }[] = [
  { value: 'PENDENTES', label: 'Pendentes' },
  { value: 'APROVADOS', label: 'Aprovados' },
  { value: 'CONCLUIDAS', label: 'Concluídas' },
  { value: 'TODAS', label: 'Todas' },
];

const LIMIT = 20;

// estilos inline para o react-select seguirem o design do shadcn/ui
const selectStyles: import('react-select').StylesConfig<Opt> = {
  control: (base, state) => ({
    ...base,
    minHeight: '32px',
    height: '32px',
    minWidth: '160px',
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.3)' : 'none',
    backgroundColor: 'hsl(var(--background))',
    '&:hover': { borderColor: 'hsl(var(--border))' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 8px' }),
  indicatorsContainer: (base) => ({ ...base, height: '32px' }),
  dropdownIndicator: (base) => ({ ...base, padding: '0 6px' }),
  clearIndicator: (base) => ({ ...base, padding: '0 4px' }),
  menu: (base) => ({
    ...base,
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 16px hsl(var(--foreground) / 0.08)',
    backgroundColor: 'hsl(var(--popover))',
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--accent))'
        : 'transparent',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
  placeholder: (base) => ({ ...base, color: 'hsl(var(--muted-foreground))' }),
  input: (base) => ({ ...base, color: 'hsl(var(--foreground))' }),
};

// ─── componente principal ────────────────────────────────────────────────────

export default function AssinaturasPendentesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const candidatoIdParam = searchParams.get('candidatoId');
  const candidatoId = candidatoIdParam ? Number(candidatoIdParam) : null;

  // ── estado da listagem ──────────────────────────────────────────────────

  const situacao = (searchParams.get('situacao') as Situacao | null) ?? 'PENDENTES';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  // filtros lidos da URL (fonte da verdade)
  const filialParam = searchParams.get('filial') ?? '';
  const setorParam = searchParams.get('setor') ?? '';
  const cargoParam = searchParams.get('cargo') ?? '';

  // opções carregadas do backend
  const [filtrosOpts, setFiltrosOpts] = useState<FiltrosResponse | null>(null);

  useEffect(() => {
    api.get<FiltrosResponse>('/documentos/assinaturas/rh/filtros').then(({ data }) => setFiltrosOpts(data)).catch(() => {});
  }, []);

  const filiaisOpts = useMemo<Opt[]>(
    () => (filtrosOpts?.filiais ?? []).map((f) => ({
      value: String(f.numero),
      label: f.nome ? `${String(f.numero).padStart(2, '0')} - ${f.nome}` : String(f.numero).padStart(2, '0'),
    })),
    [filtrosOpts],
  );

  const setoresOpts = useMemo<Opt[]>(
    () => (filtrosOpts?.setores ?? []).map((s) => ({ value: s, label: s })),
    [filtrosOpts],
  );

  const cargosOpts = useMemo<Opt[]>(
    () => (filtrosOpts?.cargos ?? []).map((c) => ({ value: c, label: c })),
    [filtrosOpts],
  );

  const filialValue = filiaisOpts.find((o) => o.value === filialParam) ?? null;
  const setorValue = setoresOpts.find((o) => o.value === setorParam) ?? null;
  const cargoValue = cargosOpts.find((o) => o.value === cargoParam) ?? null;

  const [lista, setLista] = useState<ListaResponse | null>(null);
  const [isLoadingLista, setIsLoadingLista] = useState(true);
  const [errorLista, setErrorLista] = useState('');
  const [gerandoListaId, setGerandoListaId] = useState<number | null>(null);

  const gerarAssinaturasLista = async (candidaturaId: number) => {
    setErrorLista('');
    setGerandoListaId(candidaturaId);
    try {
      await api.post(`/documentos/assinaturas/rh/candidaturas/${candidaturaId}/gerar`);
      await loadLista();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorLista(typeof msg === 'string' ? msg : 'Não foi possível gerar documentos para assinatura.');
    } finally {
      setGerandoListaId(null);
    }
  };

  const loadLista = useCallback(async () => {
    setIsLoadingLista(true);
    setErrorLista('');
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT, situacao };
      if (filialParam) params.filial = filialParam;
      if (setorParam) params.setor = setorParam;
      if (cargoParam) params.cargo = cargoParam;
      const { data } = await api.get<ListaResponse>('/documentos/assinaturas/rh/lista', { params });
      setLista(data);
    } catch {
      setErrorLista('Não foi possível carregar assinaturas.');
    } finally {
      setIsLoadingLista(false);
    }
  }, [page, situacao, filialParam, setorParam, cargoParam]);

  useEffect(() => {
    if (candidatoId === null) loadLista();
  }, [candidatoId, loadLista]);

  const temFiltro = Boolean(filialParam || setorParam || cargoParam);

  const buildParams = (overrides: Record<string, string> = {}) => {
    const next: Record<string, string> = { situacao, page: '1', ...overrides };
    if (filialParam && !('filial' in overrides)) next.filial = filialParam;
    if (setorParam && !('setor' in overrides)) next.setor = setorParam;
    if (cargoParam && !('cargo' in overrides)) next.cargo = cargoParam;
    return next;
  };

  const setSituacao = (s: Situacao) => setSearchParams({ ...buildParams(), situacao: s, page: '1' });
  const setPage = (p: number) => setSearchParams({ ...buildParams(), page: String(p) });

  const setFilial = (opt: Opt | null) =>
    setSearchParams(opt ? buildParams({ filial: opt.value }) : buildParams({ filial: '' }));
  const setSetor = (opt: Opt | null) =>
    setSearchParams(opt ? buildParams({ setor: opt.value }) : buildParams({ setor: '' }));
  const setCargo = (opt: Opt | null) =>
    setSearchParams(opt ? buildParams({ cargo: opt.value }) : buildParams({ cargo: '' }));

  const limparFiltros = () => setSearchParams({ situacao, page: '1' });

  // ── estado da visão de detalhe ──────────────────────────────────────────

  const [documentos, setDocumentos] = useState<DocumentosCandidatura[]>([]);
  const [assinaturas, setAssinaturas] = useState<AssinaturasCandidatura[]>([]);
  const [isLoadingDetalhe, setIsLoadingDetalhe] = useState(true);
  const [errorDetalhe, setErrorDetalhe] = useState('');
  const [gerandoId, setGerandoId] = useState<number | null>(null);
  const [messageDetalhe, setMessageDetalhe] = useState('');

  const loadDetalhe = useCallback(async () => {
    const [{ data: documentosData }, { data: assinaturasData }] = await Promise.all([
      api.get<DocumentosCandidatura[]>('/documentos/rh'),
      api.get<{ data: AssinaturasCandidatura[] }>('/documentos/assinaturas/rh', {
        params: { candidatoId },
      }),
    ]);
    setDocumentos(documentosData);
    setAssinaturas(assinaturasData.data);
  }, [candidatoId]);

  useEffect(() => {
    if (candidatoId !== null) {
      setIsLoadingDetalhe(true);
      loadDetalhe()
        .catch(() => setErrorDetalhe('Não foi possível carregar dados do candidato.'))
        .finally(() => setIsLoadingDetalhe(false));
    }
  }, [candidatoId, loadDetalhe]);

  const gerarAssinaturas = async (candidaturaId: number) => {
    setErrorDetalhe('');
    setMessageDetalhe('');
    setGerandoId(candidaturaId);
    try {
      await api.post(`/documentos/assinaturas/rh/candidaturas/${candidaturaId}/gerar`);
      setMessageDetalhe('Documentos gerados com sucesso.');
      await loadDetalhe();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorDetalhe(typeof msg === 'string' ? msg : 'Não foi possível gerar documentos para assinatura.');
    } finally {
      setGerandoId(null);
    }
  };

  // ── visão de detalhe ────────────────────────────────────────────────────

  if (candidatoId !== null) {
    const candidaturaDoc = documentos.find((d) => d.candidato.id === candidatoId) ?? null;
    const candidaturaAssinatura = assinaturas.find((a) => a.candidato.id === candidatoId) ?? null;
    const prontoParaGerar = candidaturaDoc ? documentosProntosParaAssinatura(candidaturaDoc) : false;
    const envelopes = candidaturaAssinatura?.envelopesAssinatura ?? [];
    const stats = getEnvelopeStats(envelopes);
    const candidatoNome =
      candidaturaDoc?.candidato.nome ??
      candidaturaAssinatura?.candidato.nome ??
      candidaturaDoc?.candidato.cpf ??
      candidaturaAssinatura?.candidato.cpf ??
      `Candidato #${candidatoId}`;

    return (
      <>
        <PageHeader
          eyebrow="Assinaturas"
          title={candidatoNome}
          description={
            candidaturaDoc
              ? formatCandidaturaTitle(candidaturaDoc)
              : 'Documentos para assinatura'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/assinaturas')}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/candidatos/${candidatoId}`}>
                  <User className="h-4 w-4" />
                  Visualizar candidato
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
              {envelopes.length > 0 && (
                <div className="rounded-xl border bg-card px-4 py-2 text-sm">
                  <span className="font-semibold">{stats.signed}/{stats.total}</span>{' '}
                  <span className="text-muted-foreground">documentos assinados</span>
                </div>
              )}
            </div>
          }
        />

        {errorDetalhe && <p className="mb-4 text-sm text-destructive">{errorDetalhe}</p>}
        {messageDetalhe && (
          <p className="mb-4 rounded-xl border bg-card px-4 py-3 text-sm text-primary">
            {messageDetalhe}
          </p>
        )}

        {isLoadingDetalhe ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando dados...
            </CardContent>
          </Card>
        ) : envelopes.length > 0 ? (
          <section className="space-y-4">
            {envelopes.map((envelope) => (
              <div
                key={envelope.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <p className="font-semibold">{envelopeTitle(envelope.setor)}</p>
                    <p className="text-xs text-muted-foreground">
                      {envelope.documentos.filter((d) => d.status === 'ASSINADO').length}/
                      {envelope.documentos.length} assinados
                    </p>
                  </div>
                  {envelope.status === 'CONCLUIDO' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <PenLine className="h-3 w-3" />
                      {envelope.documentos.filter((d) => d.status !== 'ASSINADO').length} pendente(s)
                    </span>
                  )}
                </div>
                <div className="grid gap-3 p-5 xl:grid-cols-2">
                  {envelope.documentos.map((documento) => (
                    <div key={documento.id} className="rounded-xl border bg-background p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{documento.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Hash: {documento.hashAssinado ?? documento.hashOriginal}
                          </p>
                          {documento.codigoVerificacao && (
                            <p className="text-xs text-muted-foreground">
                              Verificação:{' '}
                              <Link
                                to={`/verificar/${documento.codigoVerificacao}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono underline hover:text-foreground"
                              >
                                {documento.codigoVerificacao}
                              </Link>
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            documento.status === 'ASSINADO'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {documento.status === 'ASSINADO' ? 'Assinado' : 'Pendente'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a
                            href={getDocumentoAssinaturaRhUrl(documento.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye className="h-4 w-4" /> Abrir PDF
                          </a>
                        </Button>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a
                            href={getDocumentoAssinaturaRhUrl(documento.id)}
                            download={`documento-assinatura-${documento.id}.pdf`}
                          >
                            <Download className="h-4 w-4" /> Baixar
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : prontoParaGerar && candidaturaDoc ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <FileSignature className="h-10 w-10 opacity-40" />
              <div>
                <p className="font-semibold text-foreground">Nenhum documento gerado ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Todos os documentos obrigatórios foram aprovados. Gere os documentos para que o
                  candidato possa assinar.
                </p>
              </div>
              <Button
                type="button"
                disabled={gerandoId === candidaturaDoc.id}
                onClick={() => gerarAssinaturas(candidaturaDoc.id)}
              >
                {gerandoId === candidaturaDoc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4" />
                )}
                Gerar documentos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed text-center">
            <CardContent className="p-10 text-sm text-muted-foreground">
              <FileSignature className="mx-auto h-10 w-10 opacity-40" />
              <p className="mt-3 font-semibold text-foreground">
                Candidato não encontrado ou sem documentos aprovados
              </p>
              <p className="mt-1">
                Verifique se todos os documentos obrigatórios foram aprovados antes de gerar os
                documentos para assinatura.
              </p>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // ── visão de listagem paginada ──────────────────────────────────────────

  return (
    <>
      <PageHeader
        eyebrow="Assinaturas"
        title="Assinaturas"
        description="Acompanhe os contratos dos candidatos em processo de assinatura."
        actions={
          lista && (
            <span className="rounded-full border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground">
              {lista.total} {lista.total === 1 ? 'registro' : 'registros'}
            </span>
          )
        }
      />

      {/* Abas de situação + filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
          {SITUACAO_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSituacao(tab.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                situacao === tab.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </div>
          <ReactSelect<Opt>
            options={filiaisOpts}
            value={filialValue}
            onChange={setFilial}
            placeholder="Filial"
            isClearable
            isLoading={!filtrosOpts}
            noOptionsMessage={() => 'Nenhuma filial'}
            styles={selectStyles}
            classNamePrefix="rs"
          />
          <ReactSelect<Opt>
            options={setoresOpts}
            value={setorValue}
            onChange={setSetor}
            placeholder="Setor"
            isClearable
            isLoading={!filtrosOpts}
            noOptionsMessage={() => 'Nenhum setor'}
            styles={selectStyles}
            classNamePrefix="rs"
          />
          <ReactSelect<Opt>
            options={cargosOpts}
            value={cargoValue}
            onChange={setCargo}
            placeholder="Cargo"
            isClearable
            isLoading={!filtrosOpts}
            noOptionsMessage={() => 'Nenhum cargo'}
            styles={selectStyles}
            classNamePrefix="rs"
          />
          {temFiltro && (
            <Button size="sm" variant="ghost" onClick={limparFiltros} className="h-8 px-2">
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {errorLista && <p className="mb-4 text-sm text-destructive">{errorLista}</p>}

      {isLoadingLista ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando assinaturas...
          </CardContent>
        </Card>
      ) : !lista || lista.data.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardContent className="p-10 text-sm text-muted-foreground">
            <FileSignature className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3 font-semibold text-foreground">
              {situacao === 'PENDENTES'
                ? 'Nenhuma assinatura pendente'
                : situacao === 'APROVADOS'
                  ? 'Nenhum candidato aprovado aguardando geração'
                  : situacao === 'CONCLUIDAS'
                    ? 'Nenhuma assinatura concluída'
                    : 'Nenhuma assinatura encontrada'}
            </p>
            {situacao === 'APROVADOS' && (
              <p className="mt-1">
                Candidatos com todos os documentos obrigatórios aprovados aparecerão aqui.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Candidato
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Data admissão
                    </th>
                    {situacao !== 'APROVADOS' && (
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                        Envelopes
                      </th>
                    )}
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.data.map((row) => {
                    const dataAdmissao = formatDate(row.admissao);
                    const dataPrevista = formatDate(row.requisicao.dataPrevistaAdmissao);
                    const dataLabel = dataAdmissao
                      ? { valor: dataAdmissao, tipo: 'Admissão' }
                      : dataPrevista
                        ? { valor: dataPrevista, tipo: 'Prevista' }
                        : null;

                    const concluidos = row.envelopesAssinatura.filter(
                      (e) => e.status === 'CONCLUIDO',
                    ).length;
                    const total = row.envelopesAssinatura.length;

                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            <Link
                              to={`/candidatos/${row.candidato.id}/editar`}
                              className="hover:underline hover:text-primary"
                            >
                              {row.candidato.nome ?? row.candidato.cpf}
                            </Link>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCandidaturaListItem(row)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {dataLabel ? (
                            <div>
                              <p className="font-medium">{dataLabel.valor}</p>
                              <p className="text-xs text-muted-foreground">{dataLabel.tipo}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {situacao !== 'APROVADOS' && (
                          <td className="px-4 py-3">
                            {total === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : concluidos === total ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-3 w-3" /> {concluidos}/{total} concluídos
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                <PenLine className="h-3 w-3" /> {concluidos}/{total} concluídos
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          {situacao === 'APROVADOS' ? (
                            <Button
                              size="sm"
                              disabled={gerandoListaId === row.id}
                              onClick={() => gerarAssinaturasLista(row.id)}
                            >
                              {gerandoListaId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileSignature className="h-4 w-4" />
                              )}
                              Gerar documentos
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/assinaturas/${row.candidato.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver documentos
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Paginação */}
          {lista.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {lista.page} de {lista.totalPages} · {lista.total} registros
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lista.page <= 1}
                  onClick={() => setPage(lista.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lista.page >= lista.totalPages}
                  onClick={() => setPage(lista.page + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

