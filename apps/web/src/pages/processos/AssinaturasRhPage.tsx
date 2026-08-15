import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CircleAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  FileSignature,
  Fingerprint,
  Loader2,
  PenLine,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBiometria } from '@/context/BiometriaContext';
import api from '@/lib/api';
import {
  type AssinaturasCandidatura,
  type DocumentoAssinatura,
  type DocumentosCandidatura,
  type EnvelopeAssinatura,
  formatCandidaturaTitle,
  getDocumentoAssinaturaRhUrl,
} from './documentos.model';

const documentosProntosParaAssinatura = (candidatura: DocumentosCandidatura) => {
  return candidatura.status === 'APROVADO' || candidatura.status === 'EFETIVADO';
};

const getEnvelopeStats = (envelopes: EnvelopeAssinatura[]) => {
  const candidatoEnvelopes = envelopes.filter((e) => e.tipoSignatario === 'CANDIDATO');
  const total = candidatoEnvelopes.reduce((sum, envelope) => sum + envelope.documentos.length, 0);
  const signed = candidatoEnvelopes.reduce(
    (sum, envelope) =>
      sum + envelope.documentos.filter((documento) => documento.status === 'ASSINADO').length,
    0,
  );
  const pending = total - signed;
  return { total, signed, pending };
};

interface AssinaturasRhResponse {
  data: AssinaturasCandidatura[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BiometriaSolicitacao {
  id: number;
  status: 'PENDENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDA' | 'REPROVADA' | 'FALHOU' | 'EXPIRADA';
  envelopeId: number | null;
  dispositivoId: number | null;
  mensagem: string | null;
}

const LIMIT = 20;

export default function AssinaturasRhPage() {
  const { candidatoId: candidatoIdParam } = useParams<{ candidatoId: string }>();
  const candidatoId = candidatoIdParam ? Number(candidatoIdParam) : null;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const [documentos, setDocumentos] = useState<DocumentosCandidatura[]>([]);
  const [assinaturas, setAssinaturas] = useState<AssinaturasRhResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gerandoId, setGerandoId] = useState<number | null>(null);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<number | null>(null);
  const [solicitandoBiometriaEnvelopeId, setSolicitandoBiometriaEnvelopeId] = useState<
    number | null
  >(null);
  const [solicitacaoEmAndamento, setSolicitacaoEmAndamento] = useState<BiometriaSolicitacao | null>(null);
  const [tentativaRecusada, setTentativaRecusada] = useState<BiometriaSolicitacao | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { dispositivoAtivo } = useBiometria();

  const loadData = useCallback(async () => {
    const params = candidatoId ? { candidatoId } : { page, limit: LIMIT };
    const [{ data: documentosData }, { data: assinaturasData }] = await Promise.all([
      api.get<DocumentosCandidatura[]>('/documentos/rh'),
      api.get<AssinaturasRhResponse>('/documentos/assinaturas/rh', { params }),
    ]);
    setDocumentos(
      candidatoId
        ? documentosData.filter((item) => item.candidato.id === candidatoId)
        : documentosData,
    );
    setAssinaturas(assinaturasData);

  }, [candidatoId, page]);

  useEffect(() => {
    setIsLoading(true);
    loadData()
      .catch(() => setError('Não foi possível carregar assinaturas.'))
      .finally(() => setIsLoading(false));
  }, [loadData]);

  const rows = useMemo(() => {
    const assinaturasData = assinaturas?.data ?? [];
    const documentosDaPagina = candidatoId
      ? documentos
      : documentos.filter((candidatura) =>
          assinaturasData.some((item) => item.id === candidatura.id),
        );
    return documentosDaPagina
      .map((candidatura) => {
        const assinatura = assinaturasData.find((item) => item.id === candidatura.id) ?? null;
        return {
          candidatura,
          assinatura,
          prontoParaGerar: documentosProntosParaAssinatura(candidatura),
        };
      })
      .filter((row) => row.assinatura || row.prontoParaGerar);
  }, [assinaturas, candidatoId, documentos]);

  const pendentes = rows.filter((row) => {
    if (!row.assinatura) return row.prontoParaGerar;
    return getEnvelopeStats(row.assinatura.envelopesAssinatura).pending > 0;
  }).length;

  const concluidas = rows.filter((row) => {
    if (!row.assinatura) return false;
    const stats = getEnvelopeStats(row.assinatura.envelopesAssinatura);
    return stats.total > 0 && stats.pending === 0;
  }).length;

  useEffect(() => {
    if (!solicitacaoEmAndamento) return;

    const checkSolicitacao = async () => {
      try {
        const { data } = await api.get<BiometriaSolicitacao>(
          `/biometria/solicitacoes/${solicitacaoEmAndamento.id}`,
        );
        if (data.status === 'REPROVADA') {
          setTentativaRecusada(data);
          setSolicitacaoEmAndamento(null);
          setSolicitandoBiometriaEnvelopeId(null);
          return;
        }
        if (data.status === 'FALHOU' || data.status === 'EXPIRADA') {
          setError(data.mensagem ?? 'Não foi possível concluir a biometria. Solicite uma nova tentativa.');
          setSolicitacaoEmAndamento(null);
          setSolicitandoBiometriaEnvelopeId(null);
          return;
        }
        if (data.status === 'CONCLUIDA') {
          setMessage('Assinatura biométrica concluída com sucesso.');
          setSolicitacaoEmAndamento(null);
          setSolicitandoBiometriaEnvelopeId(null);
          await loadData();
        }
      } catch {
        setError('Não foi possível acompanhar a solicitação biométrica.');
        setSolicitacaoEmAndamento(null);
      }
    };

    void checkSolicitacao();
    const interval = setInterval(() => void checkSolicitacao(), 5000);
    return () => clearInterval(interval);
  }, [loadData, solicitacaoEmAndamento]);

  useEffect(() => {
    if (solicitandoBiometriaEnvelopeId === null) return;
    const timeout = setTimeout(() => setSolicitandoBiometriaEnvelopeId(null), 60_000);
    return () => clearTimeout(timeout);
  }, [solicitandoBiometriaEnvelopeId]);

  const gerarAssinaturas = async (candidaturaId: number) => {
    setError('');
    setMessage('');
    setGerandoId(candidaturaId);
    try {
      await api.post(`/documentos/assinaturas/rh/candidaturas/${candidaturaId}/gerar`);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(
        typeof msg === 'string' ? msg : 'Não foi possível gerar documentos para assinatura.',
      );
    } finally {
      setGerandoId(null);
    }
  };

  const enviarAssinaturas = async (candidaturaId: number) => {
    setError('');
    setMessage('');
    setEnviandoId(candidaturaId);
    try {
      const { data } = await api.post<{ message: string }>(
        `/documentos/assinaturas/rh/candidaturas/${candidaturaId}/enviar`,
      );
      setMessage(data.message);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Não foi possível enviar os documentos ao candidato.');
    } finally {
      setEnviandoId(null);
    }
  };

  const excluirAssinaturas = async (candidaturaId: number) => {
    setError('');
    setMessage('');
    setExcluindoId(candidaturaId);
    try {
      await api.delete(`/documentos/assinaturas/rh/candidaturas/${candidaturaId}`);
      await loadData();
      setMessage('Documentos de assinatura excluídos.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(
        typeof msg === 'string' ? msg : 'Não foi possível excluir os documentos de assinatura.',
      );
    } finally {
      setExcluindoId(null);
      setConfirmandoExclusaoId(null);
    }
  };

  const solicitarAssinaturaBiometrica = async (envelopeId: number, idfaceIp?: string) => {
    setError('');
    setMessage('');
    const selectedIdfaceIp = idfaceIp ?? dispositivoAtivo?.ip;
    if (!selectedIdfaceIp) {
      setError('Selecione o iDFace que será usado para a assinatura.');
      return;
    }
    setSolicitandoBiometriaEnvelopeId(envelopeId);
    try {
      const { data } = await api.post<BiometriaSolicitacao>(`/biometria/envelopes/${envelopeId}/assinatura`, {
        idfaceIp: selectedIdfaceIp,
      });
      setSolicitacaoEmAndamento(data);
      setMessage(
        'Solicitação de assinatura biométrica criada. Aguarde o colaborador se identificar no iDFace.',
      );
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(
        typeof msg === 'string' ? msg : 'Não foi possível solicitar a assinatura biométrica.',
      );
      setSolicitandoBiometriaEnvelopeId(null);
    }
  };

  const solicitarBiometriaResponsavel = async (envelopeId: number, idfaceIp?: string) => {
    setError('');
    setMessage('');
    const selectedIdfaceIp = idfaceIp ?? dispositivoAtivo?.ip;
    if (!selectedIdfaceIp) {
      setError('Selecione o iDFace que será usado para a assinatura.');
      return;
    }
    setSolicitandoBiometriaEnvelopeId(envelopeId);
    try {
      const { data } = await api.post<BiometriaSolicitacao>(`/biometria/envelopes/${envelopeId}/assinatura-responsavel`, {
        idfaceIp: selectedIdfaceIp,
      });
      setSolicitacaoEmAndamento(data);
      setMessage(
        'Solicitação de assinatura biométrica do responsável legal criada. Aguarde o responsável se identificar no iDFace.',
      );
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(
        typeof msg === 'string' ? msg : 'Não foi possível solicitar a biometria do responsável legal.',
      );
      setSolicitandoBiometriaEnvelopeId(null);
    }
  };

  const retryBiometria = async () => {
    if (!tentativaRecusada?.envelopeId || !dispositivoAtivo) return;
    const { envelopeId } = tentativaRecusada;
    setTentativaRecusada(null);

    // Detecta se é envelope RESPONSAVEL para usar a rota correta
    const allEnvelopes = rows.flatMap((r) => r.assinatura?.envelopesAssinatura ?? []);
    const envelope = allEnvelopes.find((e) => e.id === envelopeId);
    if (envelope?.tipoSignatario === 'RESPONSAVEL') {
      await solicitarBiometriaResponsavel(envelopeId, dispositivoAtivo.ip);
    } else {
      await solicitarAssinaturaBiometrica(envelopeId, dispositivoAtivo.ip);
    }
  };

  const candidatoNome = rows[0]?.candidatura.candidato.nome ?? rows[0]?.candidatura.candidato.cpf;
  const portalAccessToken = rows[0]?.assinatura?.portalAccessToken;

  return (
    <>
      <PageHeader
        eyebrow="Assinaturas"
        title={candidatoNome ?? 'Documentos para assinatura'}
        description="Gere envelopes e acompanhe contratos pendentes de assinatura."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/assinaturas')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            {portalAccessToken && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/candidato/documentos/${portalAccessToken}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Documentos admissionais
                </a>
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm sm:flex">
              <span className="rounded-full border bg-card px-3 py-2 font-semibold text-muted-foreground">
                Pendentes · {pendentes}
              </span>
              <span className="rounded-full border bg-card px-3 py-2 font-semibold text-muted-foreground">
                Concluídas · {concluidas}
              </span>
            </div>
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {message && (
        <p className="mb-4 rounded-xl border bg-card px-4 py-3 text-sm text-primary">{message}</p>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando assinaturas...
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardContent className="p-10 text-sm text-muted-foreground">
            <FileSignature className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3 font-semibold text-foreground">
              Nenhum candidato pronto para assinatura
            </p>
            <p className="mt-1">
              Quando todos os documentos obrigatórios forem aprovados, o candidato aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          {rows.map((row) => (
            <AssinaturaCandidaturaCard
              key={row.candidatura.id}
              candidatura={row.candidatura}
              assinatura={row.assinatura}
              isGerando={gerandoId === row.candidatura.id}
              isEnviando={enviandoId === row.candidatura.id}
              isExcluindo={excluindoId === row.candidatura.id}
              solicitandoBiometriaEnvelopeId={solicitandoBiometriaEnvelopeId}
              hasDispositivoAtivo={Boolean(dispositivoAtivo)}
              onGerar={() => gerarAssinaturas(row.candidatura.id)}
              onEnviar={() => enviarAssinaturas(row.candidatura.id)}
              onExcluir={() => setConfirmandoExclusaoId(row.candidatura.id)}
              onSolicitarBiometria={solicitarAssinaturaBiometrica}
              onSolicitarBiometriaResponsavel={solicitarBiometriaResponsavel}
            />
          ))}
          {!candidatoId && assinaturas && assinaturas.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {assinaturas.page} de {assinaturas.totalPages} · {assinaturas.total}{' '}
                candidatos
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={assinaturas.page <= 1}
                  onClick={() => setSearchParams({ page: String(assinaturas.page - 1) })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={assinaturas.page >= assinaturas.totalPages}
                  onClick={() => setSearchParams({ page: String(assinaturas.page + 1) })}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {confirmandoExclusaoId !== null && (
        <ConfirmDeleteModal
          isSubmitting={excluindoId === confirmandoExclusaoId}
          onCancel={() => setConfirmandoExclusaoId(null)}
          onConfirm={() => excluirAssinaturas(confirmandoExclusaoId)}
        />
      )}
      {tentativaRecusada && (
        <BiometriaNaoCorrespondenteModal
          isSubmitting={solicitandoBiometriaEnvelopeId === tentativaRecusada.envelopeId}
          onClose={() => setTentativaRecusada(null)}
          onRetry={() => void retryBiometria()}
        />
      )}
    </>
  );
}

function BiometriaNaoCorrespondenteModal({
  isSubmitting,
  onClose,
  onRetry,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-6" role="dialog" aria-modal="true" aria-labelledby="biometria-reprovada-title">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <CircleAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 id="biometria-reprovada-title" className="font-semibold">A facial não corresponde</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Peça para a pessoa se posicionar novamente diante do iDFace e tente outra vez.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Fechar</Button>
          <Button type="button" disabled={isSubmitting} onClick={onRetry}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="confirm-delete-title" className="font-semibold">
              Excluir documentos de assinatura?
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Os documentos gerados e seus envelopes serão removidos. Essa ação só pode ser feita
              antes de qualquer assinatura.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir documentos
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssinaturaCandidaturaCard({
  candidatura,
  assinatura,
  isGerando,
  isEnviando,
  isExcluindo,
  solicitandoBiometriaEnvelopeId,
  hasDispositivoAtivo,
  onGerar,
  onEnviar,
  onExcluir,
  onSolicitarBiometria,
  onSolicitarBiometriaResponsavel,
}: {
  candidatura: DocumentosCandidatura;
  assinatura: AssinaturasCandidatura | null;
  isGerando: boolean;
  isEnviando: boolean;
  isExcluindo: boolean;
  solicitandoBiometriaEnvelopeId: number | null;
  hasDispositivoAtivo: boolean;
  onGerar: () => void;
  onEnviar: () => void;
  onExcluir: () => void;
  onSolicitarBiometria: (envelopeId: number, idfaceIp?: string) => void;
  onSolicitarBiometriaResponsavel: (envelopeId: number, idfaceIp?: string) => void;
}) {
  const allEnvelopes = assinatura?.envelopesAssinatura ?? [];
  const candidatoEnvelopes = allEnvelopes.filter((e) => e.tipoSignatario === 'CANDIDATO');
  const responsavelEnvelopes = allEnvelopes.filter((e) => e.tipoSignatario === 'RESPONSAVEL');
  const isMenor = responsavelEnvelopes.length > 0;
  const stats = getEnvelopeStats(allEnvelopes);

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">
              <Link
                to={`/candidatos/${candidatura.candidato.id}/editar`}
                className="hover:underline hover:text-primary"
              >
                {candidatura.candidato.nome ?? candidatura.candidato.cpf}
              </Link>
            </h2>
            {assinatura ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                <PenLine className="h-3.5 w-3.5" />
                {stats.pending > 0 ? `${stats.pending} pendente(s)` : 'Concluída'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pronto para gerar
              </span>
            )}
            {isMenor && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <UserCheck className="h-3.5 w-3.5" />
                Menor de 18
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCandidaturaTitle(candidatura)}
          </p>
        </div>

        {assinatura ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border bg-background px-4 py-3 text-sm">
              <span className="font-semibold">
                {stats.signed}/{stats.total}
              </span>{' '}
              <span className="text-muted-foreground">documentos assinados</span>
            </div>
            <Button type="button" variant="outline" disabled={isEnviando} onClick={onEnviar}>
              {isEnviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar ao candidato
            </Button>
            {stats.signed === 0 && (
              <Button type="button" variant="outline" disabled={isExcluindo} onClick={onExcluir}>
                {isExcluindo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir documentos
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={isGerando} onClick={onGerar}>
              {isGerando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSignature className="h-4 w-4" />
              )}
              Gerar documentos
            </Button>
          </div>
        )}
      </div>

      {assinatura && (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {candidatoEnvelopes.map((envelope) => {
            const responsavelEnvelope = responsavelEnvelopes.find((r) => r.setor === envelope.setor);
            return (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                responsavelEnvelope={responsavelEnvelope ?? null}
                isSolicitandoBiometria={
                  solicitandoBiometriaEnvelopeId === envelope.id ||
                  solicitandoBiometriaEnvelopeId === responsavelEnvelope?.id
                }
                hasDispositivoAtivo={hasDispositivoAtivo}
                onSolicitarBiometria={() => onSolicitarBiometria(envelope.id)}
                onSolicitarBiometriaResponsavel={
                  responsavelEnvelope
                    ? () => onSolicitarBiometriaResponsavel(responsavelEnvelope.id)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </article>
  );
}

function EnvelopeCard({
  envelope,
  responsavelEnvelope,
  isSolicitandoBiometria,
  hasDispositivoAtivo,
  onSolicitarBiometria,
  onSolicitarBiometriaResponsavel,
}: {
  envelope: EnvelopeAssinatura;
  responsavelEnvelope: EnvelopeAssinatura | null;
  isSolicitandoBiometria: boolean;
  hasDispositivoAtivo: boolean;
  onSolicitarBiometria: () => void;
  onSolicitarBiometriaResponsavel?: () => void;
}) {
  const isMenor = responsavelEnvelope != null;
  const candidatoSigned = envelope.documentos.filter((d) => d.status === 'ASSINADO').length;
  const candidatoPending = envelope.documentos.length - candidatoSigned;
  const candidatoComplete = candidatoPending === 0 && envelope.documentos.length > 0;

  const responsavelSigned = envelope.documentos.filter((d) => d.responsavelAssinadoEm != null).length;
  const responsavelComplete = isMenor && responsavelSigned === envelope.documentos.length;
  const allComplete = candidatoComplete && (!isMenor || responsavelComplete);

  const setorLabel = envelope.setor === 'ADM_PESSOAL' ? 'Adm Pessoal' : 'SESMT';

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{setorLabel}</p>
          <p className="text-xs text-muted-foreground">
            {candidatoSigned}/{envelope.documentos.length} assinados
            {isMenor && ` · Responsável: ${responsavelSigned}/${envelope.documentos.length}`}
          </p>
        </div>
        {allComplete ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Concluído
          </span>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {!candidatoComplete && (
              <Button
                type="button"
                size="sm"
                className="text-white hover:text-white"
                disabled={isSolicitandoBiometria || !hasDispositivoAtivo}
                onClick={onSolicitarBiometria}
              >
                {isSolicitandoBiometria ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                Biometria do colaborador
              </Button>
            )}
            {candidatoComplete && isMenor && !responsavelComplete && onSolicitarBiometriaResponsavel && (
              <Button
                type="button"
                size="sm"
                className="border-amber-300 bg-amber-600 text-white hover:bg-amber-700 hover:text-white"
                disabled={isSolicitandoBiometria || !hasDispositivoAtivo}
                onClick={onSolicitarBiometriaResponsavel}
              >
                {isSolicitandoBiometria ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Biometria do responsável legal
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {envelope.documentos.map((documento) => (
          <DocumentoCard key={documento.id} documento={documento} isMenor={isMenor} />
        ))}
      </div>
    </div>
  );
}

function DocumentoCard({ documento, isMenor }: { documento: DocumentoAssinatura; isMenor: boolean }) {
  const candidatoAssinado = documento.status === 'ASSINADO';
  const responsavelAssinado = documento.responsavelAssinadoEm != null;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{documento.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            Hash: {documento.responsavelHashAssinado ?? documento.hashAssinado ?? documento.hashOriginal}
          </p>
          {documento.codigoVerificacao && (
            <p className="text-xs text-muted-foreground">
              Verificação:{' '}
              <a
                href={`/verificar/${documento.codigoVerificacao}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline hover:text-foreground"
              >
                {documento.codigoVerificacao}
              </a>
            </p>
          )}
          {documento.metodoAssinatura && (
            <p className="text-xs text-muted-foreground">
              Método: {documento.metodoAssinatura === 'BIOMETRIA' ? 'Biometria' : 'OTP'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              candidatoAssinado
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {candidatoAssinado ? 'Colaborador ✓' : 'Pendente'}
          </span>
          {isMenor && candidatoAssinado && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                responsavelAssinado
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {responsavelAssinado ? 'Responsável ✓' : 'Resp. pendente'}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
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
  );
}
