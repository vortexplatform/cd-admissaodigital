import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSignature,
  Fingerprint,
  Loader2,
  PenLine,
  ShieldCheck,
  Trash2,
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

const documentosProntosParaAssinatura = (candidatura: DocumentosCandidatura) => {
  return candidatura.status === 'APROVADO' || candidatura.status === 'EFETIVADO';
};

const getEnvelopeStats = (envelopes: EnvelopeAssinatura[]) => {
  const total = envelopes.reduce((sum, envelope) => sum + envelope.documentos.length, 0);
  const signed = envelopes.reduce(
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

const LIMIT = 20;

const envelopeTitle = (envelope: EnvelopeAssinatura) => {
  const setor = envelope.setor === 'ADM_PESSOAL' ? 'Adm Pessoal' : 'SESMT';
  if (envelope.tipoSignatario === 'RESPONSAVEL') return `${setor} — Responsável Legal`;
  return setor;
};

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
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<number | null>(null);
  const [cadastrandoBiometriaId, setCadastrandoBiometriaId] = useState<number | null>(null);
  const [solicitandoBiometriaEnvelopeId, setSolicitandoBiometriaEnvelopeId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const params = candidatoId ? { candidatoId } : { page, limit: LIMIT };
    const [{ data: documentosData }, { data: assinaturasData }] = await Promise.all([
      api.get<DocumentosCandidatura[]>('/documentos/rh'),
      api.get<AssinaturasRhResponse>('/documentos/assinaturas/rh', { params }),
    ]);
    setDocumentos(
      candidatoId ? documentosData.filter((item) => item.candidato.id === candidatoId) : documentosData,
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
      : documentos.filter((candidatura) => assinaturasData.some((item) => item.id === candidatura.id));
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

  const envelopesConcluidos = useMemo(
    () =>
      rows.reduce((count, row) => {
        if (!row.assinatura) return count;
        return count + row.assinatura.envelopesAssinatura.filter((e) => e.status === 'CONCLUIDO').length;
      }, 0),
    [rows],
  );

  const devePolling = useMemo(
    () =>
      message.includes('Aguarde') ||
      rows.some(
        (row) =>
          row.assinatura &&
          row.candidatura.candidato.biometriaStatus === 'CADASTRADA' &&
          getEnvelopeStats(row.assinatura.envelopesAssinatura).pending > 0,
      ),
    [message, rows],
  );

  const prevEnvelopesConcluidosRef = useRef(envelopesConcluidos);
  useEffect(() => {
    if (!isLoading && prevEnvelopesConcluidosRef.current < envelopesConcluidos) {
      setMessage('Assinatura biométrica concluída com sucesso.');
    }
    prevEnvelopesConcluidosRef.current = envelopesConcluidos;
  }, [envelopesConcluidos, isLoading]);

  useEffect(() => {
    if (!devePolling) return;
    const interval = setInterval(() => {
      loadData().catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [devePolling, loadData]);

  const gerarAssinaturas = async (candidaturaId: number) => {
    setError('');
    setMessage('');
    setGerandoId(candidaturaId);
    try {
      await api.post(`/documentos/assinaturas/rh/candidaturas/${candidaturaId}/gerar`);
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Não foi possível gerar documentos para assinatura.');
    } finally {
      setGerandoId(null);
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
      setError(typeof msg === 'string' ? msg : 'Não foi possível excluir os documentos de assinatura.');
    } finally {
      setExcluindoId(null);
      setConfirmandoExclusaoId(null);
    }
  };

  const solicitarCadastroBiometria = async (candidatoId: number) => {
    setError('');
    setMessage('');
    setCadastrandoBiometriaId(candidatoId);
    try {
      await api.post(`/biometria/candidatos/${candidatoId}/cadastro`);
      setMessage('Solicitação de cadastro biométrico criada. Aguarde o software local realizar a coleta.');
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Não foi possível solicitar o cadastro biométrico.');
    } finally {
      setCadastrandoBiometriaId(null);
    }
  };

  const solicitarAssinaturaBiometrica = async (envelopeId: number) => {
    setError('');
    setMessage('');
    setSolicitandoBiometriaEnvelopeId(envelopeId);
    try {
      await api.post(`/biometria/envelopes/${envelopeId}/assinatura`);
      setMessage('Solicitação de assinatura biométrica criada. Aguarde o software local concluir a verificação.');
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Não foi possível solicitar a assinatura biométrica.');
    } finally {
      setSolicitandoBiometriaEnvelopeId(null);
    }
  };

  const candidatoNome = rows[0]?.candidatura.candidato.nome ?? rows[0]?.candidatura.candidato.cpf;

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
      {message && <p className="mb-4 rounded-xl border bg-card px-4 py-3 text-sm text-primary">{message}</p>}

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
            <p className="mt-3 font-semibold text-foreground">Nenhum candidato pronto para assinatura</p>
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
              isExcluindo={excluindoId === row.candidatura.id}
              isCadastrandoBiometria={cadastrandoBiometriaId === row.candidatura.candidato.id}
              solicitandoBiometriaEnvelopeId={solicitandoBiometriaEnvelopeId}
              onGerar={() => gerarAssinaturas(row.candidatura.id)}
              onExcluir={() => setConfirmandoExclusaoId(row.candidatura.id)}
              onCadastrarBiometria={() => solicitarCadastroBiometria(row.candidatura.candidato.id)}
              onSolicitarBiometria={solicitarAssinaturaBiometrica}
            />
          ))}
          {!candidatoId && assinaturas && assinaturas.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {assinaturas.page} de {assinaturas.totalPages} · {assinaturas.total} candidatos
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
    </>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
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
            <h2 id="confirm-delete-title" className="font-semibold">Excluir documentos de assinatura?</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Os documentos gerados e seus envelopes serão removidos. Essa ação só pode ser feita antes de qualquer assinatura.
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
  isExcluindo,
  isCadastrandoBiometria,
  solicitandoBiometriaEnvelopeId,
  onGerar,
  onExcluir,
  onCadastrarBiometria,
  onSolicitarBiometria,
}: {
  candidatura: DocumentosCandidatura;
  assinatura: AssinaturasCandidatura | null;
  isGerando: boolean;
  isExcluindo: boolean;
  isCadastrandoBiometria: boolean;
  solicitandoBiometriaEnvelopeId: number | null;
  onGerar: () => void;
  onExcluir: () => void;
  onCadastrarBiometria: () => void;
  onSolicitarBiometria: (envelopeId: number) => void;
}) {
  const envelopes = assinatura?.envelopesAssinatura ?? [];
  const stats = getEnvelopeStats(envelopes);
  const biometriaCadastrada = candidatura.candidato.biometriaStatus === 'CADASTRADA';

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">
              {candidatura.candidato.nome ?? candidatura.candidato.cpf}
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
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                biometriaCadastrada
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              <Fingerprint className="h-3.5 w-3.5" />
              {biometriaCadastrada ? 'Biometria cadastrada' : 'Sem biometria'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatCandidaturaTitle(candidatura)}</p>
        </div>

        {assinatura ? (
          <div className="flex flex-wrap items-center gap-2">
            {!biometriaCadastrada && (
              <Button
                type="button"
                variant="outline"
                disabled={isCadastrandoBiometria}
                onClick={onCadastrarBiometria}
              >
                {isCadastrandoBiometria ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                Cadastrar biometria
              </Button>
            )}
            <div className="rounded-xl border bg-background px-4 py-3 text-sm">
              <span className="font-semibold">{stats.signed}/{stats.total}</span>{' '}
              <span className="text-muted-foreground">documentos assinados</span>
            </div>
            {stats.signed === 0 && (
              <Button type="button" variant="outline" disabled={isExcluindo} onClick={onExcluir}>
                {isExcluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir documentos
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!biometriaCadastrada && (
              <Button
                type="button"
                variant="outline"
                disabled={isCadastrandoBiometria}
                onClick={onCadastrarBiometria}
              >
                {isCadastrandoBiometria ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                Cadastrar biometria
              </Button>
            )}
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
          {envelopes.map((envelope) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
              biometriaCadastrada={biometriaCadastrada}
              isSolicitandoBiometria={solicitandoBiometriaEnvelopeId === envelope.id}
              onSolicitarBiometria={() => onSolicitarBiometria(envelope.id)}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function EnvelopeCard({
  envelope,
  biometriaCadastrada,
  isSolicitandoBiometria,
  onSolicitarBiometria,
}: {
  envelope: EnvelopeAssinatura;
  biometriaCadastrada: boolean;
  isSolicitandoBiometria: boolean;
  onSolicitarBiometria: () => void;
}) {
  const signed = envelope.documentos.filter((documento) => documento.status === 'ASSINADO').length;
  const pending = envelope.documentos.length - signed;

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{envelopeTitle(envelope)}</p>
          <p className="text-xs text-muted-foreground">
            {signed}/{envelope.documentos.length} assinados
          </p>
        </div>
        {envelope.status === 'CONCLUIDO' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Concluído
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!biometriaCadastrada || pending === 0 || isSolicitandoBiometria}
            onClick={onSolicitarBiometria}
          >
            {isSolicitandoBiometria ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4" />
            )}
            Solicitar biometria
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {envelope.documentos.map((documento) => (
          <div key={documento.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{documento.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Hash: {documento.hashAssinado ?? documento.hashOriginal}
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={getDocumentoAssinaturaRhUrl(documento.id)} target="_blank" rel="noreferrer">
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
  );
}
