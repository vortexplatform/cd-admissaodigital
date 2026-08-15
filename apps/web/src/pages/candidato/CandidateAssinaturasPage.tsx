import { useEffect, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Eye, FileSignature, KeyRound, Loader2, PenLine, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  type AssinaturasCandidatura,
  type DocumentoAssinatura,
  type EnvelopeAssinatura,
  formatCandidaturaTitle,
  getDocumentoAssinaturaUrl,
} from '../processos/documentos.model';

export default function CandidateAssinaturasPage() {
  const [candidaturas, setCandidaturas] = useState<AssinaturasCandidatura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedCandidaturaId, setSelectedCandidaturaId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [sessionTokens, setSessionTokens] = useState<Record<number, string>>({});
  const [signingId, setSigningId] = useState<number | null>(null);
  const [previewState, setPreviewState] = useState<{
    envelope: EnvelopeAssinatura;
    doc: DocumentoAssinatura;
  } | null>(null);
  const [otpState, setOtpState] = useState<{ envelope: EnvelopeAssinatura; code: string; message: string; submitting: boolean } | null>(null);

  const loadData = async () => {
    const { data } = await api.get<AssinaturasCandidatura[]>('/documentos/assinaturas/candidato');
    setCandidaturas(data);
    setSelectedCandidaturaId((current) => current ?? data[0]?.id ?? null);
  };

  useEffect(() => {
    loadData()
      .catch(() => setMessage('Não foi possível carregar os documentos para assinatura.'))
      .finally(() => setIsLoading(false));
  }, []);

  const candidatura = candidaturas.find((item) => item.id === selectedCandidaturaId) ?? candidaturas[0] ?? null;
  const allEnvelopes = candidatura?.envelopesAssinatura ?? [];
  const envelopes = allEnvelopes.filter((e) => e.tipoSignatario === 'CANDIDATO');
  const responsavelEnvelopes = allEnvelopes.filter((e) => e.tipoSignatario === 'RESPONSAVEL');
  const aguardandoResponsavel =
    envelopes.length > 0 &&
    envelopes.every((e) => e.status === 'CONCLUIDO') &&
    responsavelEnvelopes.some((e) => e.status !== 'CONCLUIDO');
  const totalDocs = envelopes.reduce((sum, envelope) => sum + envelope.documentos.length, 0);
  const signedDocs = envelopes.reduce(
    (sum, envelope) => sum + envelope.documentos.filter((doc) => doc.status === 'ASSINADO').length,
    0,
  );
  const progress = totalDocs === 0 ? 0 : Math.round((signedDocs / totalDocs) * 100);

  const generateDocuments = async () => {
    if (!candidatura) return;
    setGeneratingId(candidatura.id);
    setMessage('');
    try {
      await api.post(`/documentos/assinaturas/candidato/candidaturas/${candidatura.id}/gerar`);
      await loadData();
      setMessage('Documentos gerados com sucesso.');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(errorMessage ?? 'Não foi possível gerar os documentos para assinatura.');
    } finally {
      setGeneratingId(null);
    }
  };

  const sendOtp = async (envelope: EnvelopeAssinatura) => {
    setMessage('');
    setOtpState({ envelope, code: '', message: 'Enviando código...', submitting: true });
    try {
      const { data } = await api.post<{ identifier: string }>(`/documentos/assinaturas/${envelope.id}/otp`);
      setOtpState({ envelope, code: '', message: `Código enviado para ${data.identifier}.`, submitting: false });
      await loadData();
    } catch {
      setOtpState(null);
      setMessage('Não foi possível enviar o código de assinatura.');
    }
  };

  const verifyOtp = async () => {
    if (!otpState) return;
    setOtpState({ ...otpState, submitting: true });
    try {
      const { data } = await api.post<{ sessionToken: string }>(
        `/documentos/assinaturas/${otpState.envelope.id}/otp/verify`,
        { code: otpState.code },
      );
      setSessionTokens((current) => ({ ...current, [otpState.envelope.id]: data.sessionToken }));
      setOtpState(null);
      setMessage('Sessão de assinatura liberada por 30 minutos.');
      await loadData();
    } catch {
      setOtpState({ ...otpState, submitting: false, message: 'Código inválido ou expirado.' });
    }
  };

  const signDocumento = async (envelope: EnvelopeAssinatura, doc: DocumentoAssinatura) => {
    const sessionToken = sessionTokens[envelope.id];
    if (!sessionToken) {
      await sendOtp(envelope);
      return;
    }

    setSigningId(doc.id);
    setMessage('');
    try {
      await api.post(`/documentos/assinaturas/documentos/${doc.id}/assinar`, { sessionToken });
      await loadData();
      setPreviewState(null);
      setMessage(`Documento "${doc.nome}" assinado com sucesso.`);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const errorMessage = response?.data?.message;
      setSessionTokens((current) => {
        const next = { ...current };
        delete next[envelope.id];
        return next;
      });

      if (response?.status === 403 && errorMessage === 'Sessão de assinatura expirada.') {
        setPreviewState(null);
        setMessage('Sua sessão de assinatura expirou. Enviamos um novo código para você continuar.');
        await sendOtp(envelope);
        return;
      }

      setMessage('Não foi possível assinar. Valide o código novamente e tente de novo.');
    } finally {
      setSigningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-primary/10" />
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
            <div className="mt-6 max-w-2xl space-y-3">
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              <div className="h-8 w-80 animate-pulse rounded-lg bg-muted" />
              <div className="h-3 w-64 animate-pulse rounded bg-muted" />
              <div className="mt-2 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {candidatura.portalAccessToken && (
                <Button type="button" variant="outline" asChild>
                  <a
                    href={`/candidato/documentos/${candidatura.portalAccessToken}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Acessar documentos admissionais
                  </a>
                </Button>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border bg-background/70 p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-7 w-16 animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
          <div className="h-fit rounded-2xl border bg-card p-4 shadow-sm">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1.5">
                    <div className="h-5 w-28 animate-pulse rounded-lg bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="mt-4 space-y-3">
                  {[1, 2].map((j) => (
                    <div key={j} className="rounded-xl border bg-background p-4">
                      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                      <div className="mt-1.5 h-3 w-64 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!candidatura) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-dashed bg-card p-8 text-center shadow-sm">
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Assinaturas ainda indisponíveis</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A etapa de assinatura será liberada quando todos os documentos obrigatórios estiverem aprovados ou dispensados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {candidaturas.length > 1 && (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold">Selecione a requisição</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {candidaturas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCandidaturaId(item.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    item.id === candidatura.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-medium">{formatCandidaturaTitle(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.envelopesAssinatura.length > 0 ? 'Documentos gerados' : statusCandidaturaLabel(item.status)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-primary/10" />
            <div className="mt-6 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Assinatura eletrônica avançada</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Assine contratos e declarações
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{formatCandidaturaTitle(candidatura)}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Valide um OTP por envelope e assine cada PDF individualmente. Cada assinatura registra hash, IP, dispositivo, data/hora e código de verificação.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label="Documentos assinados" value={`${signedDocs}/${totalDocs}`} />
              <Metric label="Progresso" value={`${progress}%`} />
              <Metric label="Envelopes" value={String(envelopes.length)} />
            </div>
          </div>
        </section>

        {message && <p className="rounded-xl border bg-card px-4 py-3 text-sm text-primary">{message}</p>}

        {envelopes.length === 0 && (
          <section className="rounded-2xl border border-dashed bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Documentos de assinatura</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gere os documentos desta requisição para iniciar o processo de assinatura.
                </p>
              </div>
              {candidatura.status === 'APROVADO' || candidatura.status === 'EFETIVADO' ? (
                <Button type="button" onClick={generateDocuments} disabled={generatingId === candidatura.id}>
                  {generatingId === candidatura.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Gerar documentos
                </Button>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">Aguardando aprovação da candidatura</span>
              )}
            </div>
          </section>
        )}

        {envelopes.length > 0 && <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
          <aside className="h-fit rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold">Ordem da assinatura</p>
            <div className="mt-4 space-y-3">
              {envelopes.map((envelope, index) => (
                <div key={envelope.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{envelopeTitle(envelope)}</p>
                    <p className="text-xs text-muted-foreground">{envelope.documentos.length} documentos</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            {envelopes.map((envelope) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                hasSession={Boolean(sessionTokens[envelope.id])}
                signingId={signingId}
                onSendOtp={sendOtp}
                onOpenForSignature={(doc) => setPreviewState({ envelope, doc })}
              />
            ))}

            {aguardandoResponsavel && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Aguardando assinatura do responsável legal
                </p>
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  Você já assinou todos os seus documentos. O responsável legal receberá um link para assinar os mesmos documentos. Após a assinatura dele(a), a empresa concluirá a certificação.
                </p>
              </div>
            )}
          </div>
        </div>}
      </div>

      {previewState && (
        <SignaturePreviewModal
          doc={previewState.doc}
          isSigning={signingId === previewState.doc.id}
          onSign={() => signDocumento(previewState.envelope, previewState.doc)}
          onClose={() => {
            setPreviewState(null);
            loadData().catch(() => setMessage('Não foi possível atualizar a visualização da assinatura.'));
          }}
        />
      )}

      {otpState && (
        <OtpSignatureModal
          state={otpState}
          onCodeChange={(code) => setOtpState({ ...otpState, code })}
          onCancel={() => setOtpState(null)}
          onConfirm={verifyOtp}
        />
      )}
    </>
  );
}

const envelopeTitle = (envelope: EnvelopeAssinatura) =>
  envelope.setor === 'ADM_PESSOAL' ? 'Adm Pessoal' : 'SESMT';

const statusCandidaturaLabel = (status: AssinaturasCandidatura['status']) => {
  const labels: Record<AssinaturasCandidatura['status'], string> = {
    INSCRITO: 'Inscrita',
    EM_ANALISE: 'Em análise',
    ENTREVISTA: 'Em entrevista',
    APROVADO: 'Aprovada',
    EFETIVADO: 'Efetivada',
    REPROVADO: 'Reprovada',
    DESISTIU: 'Desistiu',
    CANCELADO: 'Cancelada',
  };
  return labels[status];
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EnvelopeCard({
  envelope,
  hasSession,
  signingId,
  onSendOtp,
  onOpenForSignature,
}: {
  envelope: EnvelopeAssinatura;
  hasSession: boolean;
  signingId: number | null;
  onSendOtp: (envelope: EnvelopeAssinatura) => void;
  onOpenForSignature: (doc: DocumentoAssinatura) => void;
}) {
  const signed = envelope.documentos.filter((doc) => doc.status === 'ASSINADO').length;
  const complete = envelope.status === 'CONCLUIDO';

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{envelopeTitle(envelope)}</h2>
          <p className="text-sm text-muted-foreground">
            {signed}/{envelope.documentos.length} documento{envelope.documentos.length > 1 ? 's' : ''} assinado{signed !== 1 ? 's' : ''}
          </p>
        </div>
        {complete ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Concluído
          </span>
        ) : hasSession ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <KeyRound className="h-3.5 w-3.5" /> Sessão validada
          </span>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => onSendOtp(envelope)}>
            <KeyRound className="h-4 w-4" /> Validar código
          </Button>
        )}
      </div>

      {!hasSession && !complete && (
        <div className="mt-4 rounded-xl border border-dashed bg-background p-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            Valide o código para iniciar a assinatura
          </div>
          <p className="mt-2">
            Os documentos deste envelope ficam ocultos até a validação do código enviado para seu canal de acesso.
          </p>
          <Button type="button" className="mt-4" onClick={() => onSendOtp(envelope)}>
            Validar código
          </Button>
        </div>
      )}

      {(hasSession || complete) && <div className="mt-4 space-y-3">
        {envelope.documentos.map((doc) => (
          <div key={doc.id} className="grid gap-3 rounded-xl border bg-background p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold leading-snug">{doc.nome}</p>
                {doc.status === 'ASSINADO' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Assinado
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">Hash: {doc.hashAssinado ?? doc.hashOriginal}</p>
              {doc.codigoVerificacao && (
                <p className="text-xs text-muted-foreground">
                  Verificação:{' '}
                  <a
                    href={`/verificar/${doc.codigoVerificacao}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline hover:text-foreground"
                  >
                    {doc.codigoVerificacao}
                  </a>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {doc.status !== 'ASSINADO' && (
                <Button type="button" size="sm" disabled={signingId === doc.id} onClick={() => onOpenForSignature(doc)}>
                  {signingId === doc.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Assinando...</>
                  ) : (
                    <><PenLine className="h-4 w-4" />Assinar</>
                  )}
                </Button>
              )}
              {doc.status === 'ASSINADO' && (
                <Button type="button" size="sm" variant="outline" onClick={() => onOpenForSignature(doc)}>
                  <Eye className="h-4 w-4" /> Visualizar PDF
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>}
    </section>
  );
}

function OtpSignatureModal({
  state,
  onCodeChange,
  onCancel,
  onConfirm,
}: {
  state: { envelope: EnvelopeAssinatura; code: string; message: string; submitting: boolean };
  onCodeChange: (code: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = state.code.trim().length === 6 && !state.submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-snug">Validar sessão de assinatura</h2>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-center text-lg tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={6}
            inputMode="numeric"
            placeholder="000000"
            value={state.code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ''))}
            disabled={state.submitting}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" disabled={state.submitting} onClick={onCancel}>Cancelar</Button>
            <Button type="button" className="flex-1" disabled={!canConfirm} onClick={onConfirm}>
              {state.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignaturePreviewModal({
  doc,
  isSigning,
  onSign,
  onClose,
}: {
  doc: DocumentoAssinatura;
  isSigning: boolean;
  onSign: () => void;
  onClose: () => void;
}) {
  const directUrl = getDocumentoAssinaturaUrl(doc.id);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const isSigned = doc.status === 'ASSINADO';

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setPdfLoaded(false);
    setPdfError('');
    setPdfUrl(null);

    api
      .get<Blob>(`/documentos/assinaturas/documentos/${doc.id}/view`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        const blob = response.data.type === 'application/pdf'
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setPdfLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setPdfError('Não foi possível carregar o PDF para assinatura.');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <PenLine className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="truncate font-semibold">{doc.nome}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl ?? directUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Abrir</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl ?? directUrl} download={`documento-assinatura-${doc.id}.pdf`}><Download className="h-4 w-4" />Baixar PDF</a>
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}><X className="h-4 w-4" />Fechar</Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 bg-muted/30">
        {!pdfUrl && !pdfError && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando PDF...
          </div>
        )}
        {pdfError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <FileSignature className="h-10 w-10 opacity-40" />
            <p>{pdfError}</p>
            <Button type="button" variant="outline" asChild>
              <a href={directUrl} target="_blank" rel="noreferrer">Abrir em nova aba</a>
            </Button>
          </div>
        )}
        {pdfUrl && (
          <object
            key={pdfUrl}
            data={`${pdfUrl}#toolbar=1&navpanes=0`}
            type="application/pdf"
            title={doc.nome}
            className="h-full min-h-[60vh] w-full bg-white"
            onLoad={() => setPdfLoaded(true)}
          >
            <embed
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="h-full min-h-[60vh] w-full bg-white"
            />
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <FileSignature className="h-10 w-10 opacity-40" />
              <p>Seu navegador não exibiu o PDF embutido.</p>
              <Button type="button" variant="outline" asChild>
                <a href={pdfUrl} target="_blank" rel="noreferrer">Abrir PDF em nova aba</a>
              </Button>
            </div>
          </object>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t bg-card p-4 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {isSigned ? 'Documento já assinado' : 'Leia o documento antes de assinar'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isSigned && doc.codigoVerificacao ? (
              <>
                Verificação:{' '}
                <a
                  href={`/verificar/${doc.codigoVerificacao}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline hover:text-foreground"
                >
                  {doc.codigoVerificacao}
                </a>
              </>
            ) : isSigned ? (
              'Código de verificação não informado'
            ) : (
              'Ao assinar, você confirma ciência e aceite deste PDF específico.'
            )}
          </p>
        </div>
        {isSigned ? (
          <Button type="button" variant="outline" onClick={onClose}>
            <CheckCircle2 className="h-4 w-4" /> Concluir
          </Button>
        ) : (
          <Button type="button" disabled={!pdfLoaded || isSigning} onClick={onSign}>
            {isSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            Assinar documento
          </Button>
        )}
      </div>
    </div>
  );
}
