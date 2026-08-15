import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, ExternalLink, Eye, FileSignature, KeyRound, Loader2, PenLine, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  type DocumentoAssinatura,
  type EnvelopeAssinatura,
  getDocumentoAssinaturaResponsavelUrl,
} from '../processos/documentos.model';

interface ResponsavelData {
  candidato: { nome: string | null; cpf: string };
  empresa: { nome: string } | null;
  envelopes: EnvelopeAssinatura[];
  responsavelEnvelopes: EnvelopeAssinatura[];
}

export default function ResponsavelAssinaturasPage() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const [data, setData] = useState<ResponsavelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<number | null>(null);
  const [previewState, setPreviewState] = useState<{
    envelope: EnvelopeAssinatura;
    doc: DocumentoAssinatura;
  } | null>(null);
  const [otpState, setOtpState] = useState<{
    code: string;
    message: string;
    submitting: boolean;
  } | null>(null);

  const basePath = `/documentos/assinaturas/responsavel/${accessToken}`;

  const loadData = async () => {
    const { data: resp } = await api.get<ResponsavelData>(basePath);
    setData(resp);
  };

  useEffect(() => {
    if (!accessToken) {
      setError('Link de acesso inválido.');
      setIsLoading(false);
      return;
    }
    loadData()
      .catch(() => setError('Link de acesso inválido ou expirado.'))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const envelopes = data?.envelopes ?? [];
  const totalDocs = envelopes.reduce((sum, env) => sum + env.documentos.length, 0);
  const signedDocs = envelopes.reduce(
    (sum, env) => sum + env.documentos.filter((d) => d.responsavelAssinadoEm != null).length,
    0,
  );

  const sendOtp = async () => {
    setMessage('');
    setOtpState({ code: '', message: 'Enviando código...', submitting: true });
    try {
      const { data: resp } = await api.post<{ identifier: string }>(`${basePath}/otp`);
      setOtpState({ code: '', message: `Código enviado para ${resp.identifier}.`, submitting: false });
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setOtpState(null);
      setMessage(msg ?? 'Não foi possível enviar o código.');
    }
  };

  const verifyOtp = async () => {
    if (!otpState) return;
    setOtpState({ ...otpState, submitting: true });
    try {
      const { data: resp } = await api.post<{ sessionToken: string }>(
        `${basePath}/otp/verify`,
        { code: otpState.code },
      );
      setSessionToken(resp.sessionToken);
      setOtpState(null);
      setMessage('Sessão de assinatura liberada por 30 minutos.');
      await loadData();
    } catch {
      setOtpState({ ...otpState, submitting: false, message: 'Código inválido ou expirado.' });
    }
  };

  const signDocumento = async (envelope: EnvelopeAssinatura, doc: DocumentoAssinatura) => {
    if (!sessionToken) {
      await sendOtp();
      return;
    }

    setSigningId(doc.id);
    setMessage('');
    try {
      await api.post(`${basePath}/documentos/${doc.id}/assinar`, { sessionToken });
      await loadData();
      setPreviewState(null);
      setMessage(`Documento "${doc.nome}" assinado com sucesso.`);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (response?.status === 403 && response?.data?.message === 'Sessão de assinatura expirada.') {
        setSessionToken(null);
        setPreviewState(null);
        setMessage('Sua sessão expirou. Enviamos um novo código para você continuar.');
        await sendOtp();
        return;
      }
      setSessionToken(null);
      setMessage('Não foi possível assinar. Valide o código novamente.');
    } finally {
      setSigningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-dashed bg-card p-8 text-center shadow-sm">
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">{error || 'Dados não encontrados'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique se o link de acesso está correto ou entre em contato com a empresa.
          </p>
        </div>
      </div>
    );
  }

  const allComplete = totalDocs > 0 && signedDocs === totalDocs;
  const candidatoNome = data.candidato.nome ?? 'Candidato';

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-amber-500/10" />
            <div className="mt-6 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
                Assinatura do responsável legal
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Documentos de {candidatoNome}
              </h1>
              {data.empresa && (
                <p className="mt-2 text-sm text-muted-foreground">{data.empresa.nome}</p>
              )}
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Você está assinando como responsável legal de <strong>{candidatoNome}</strong>.
                Valide o código OTP enviado ao seu contato e assine cada documento individualmente.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos assinados</p>
                <p className="mt-1 text-2xl font-semibold">{signedDocs}/{totalDocs}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1 text-2xl font-semibold">
                  {allComplete ? 'Concluído' : `${Math.round((signedDocs / Math.max(totalDocs, 1)) * 100)}%`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && <p className="rounded-xl border bg-card px-4 py-3 text-sm text-primary">{message}</p>}

        {!sessionToken && !allComplete && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm text-center">
            <KeyRound className="mx-auto h-8 w-8 text-amber-600" />
            <h2 className="mt-3 text-lg font-semibold">Validar código de acesso</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviaremos um código para o seu e-mail ou telefone cadastrado como responsável legal.
            </p>
            <Button type="button" className="mt-4" onClick={sendOtp}>
              <KeyRound className="h-4 w-4" /> Enviar código
            </Button>
          </div>
        )}

        {(sessionToken || allComplete) && envelopes.map((envelope) => (
          <section key={envelope.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {envelope.setor === 'ADM_PESSOAL' ? 'Adm Pessoal' : 'SESMT'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {envelope.documentos.filter((d) => d.responsavelAssinadoEm != null).length}/{envelope.documentos.length} assinados
                </p>
              </div>
              {envelope.documentos.every((d) => d.responsavelAssinadoEm != null) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Concluído
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {envelope.documentos.map((doc) => (
                <div key={doc.id} className="grid gap-3 rounded-xl border bg-background p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold leading-snug">{doc.nome}</p>
                      {doc.responsavelAssinadoEm != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Assinado
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">Hash: {doc.responsavelHashAssinado ?? doc.hashAssinado ?? doc.hashOriginal}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.responsavelAssinadoEm == null && (
                      <Button
                        type="button"
                        size="sm"
                        className="text-white hover:text-white"
                        disabled={signingId === doc.id}
                        onClick={() => setPreviewState({ envelope, doc })}
                      >
                        {signingId === doc.id ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Assinando...</>
                        ) : (
                          <><PenLine className="h-4 w-4" />Assinar</>
                        )}
                      </Button>
                    )}
                    {doc.responsavelAssinadoEm != null && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setPreviewState({ envelope, doc })}>
                        <Eye className="h-4 w-4" /> Visualizar PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {previewState && accessToken && (
        <ResponsavelPreviewModal
          doc={previewState.doc}
          accessToken={accessToken}
          isSigning={signingId === previewState.doc.id}
          onSign={() => signDocumento(previewState.envelope, previewState.doc)}
          onClose={() => {
            setPreviewState(null);
            loadData().catch(() => {});
          }}
        />
      )}

      {otpState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold leading-snug">Validar código de acesso</h2>
                <p className="mt-1 text-sm text-muted-foreground">{otpState.message}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-center text-lg tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={6}
                inputMode="numeric"
                placeholder="000000"
                value={otpState.code}
                onChange={(e) => setOtpState({ ...otpState, code: e.target.value.replace(/\D/g, '') })}
                disabled={otpState.submitting}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" disabled={otpState.submitting} onClick={() => setOtpState(null)}>Cancelar</Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={otpState.code.trim().length !== 6 || otpState.submitting}
                  onClick={verifyOtp}
                >
                  {otpState.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResponsavelPreviewModal({
  doc,
  accessToken,
  isSigning,
  onSign,
  onClose,
}: {
  doc: DocumentoAssinatura;
  accessToken: string;
  isSigning: boolean;
  onSign: () => void;
  onClose: () => void;
}) {
  const directUrl = getDocumentoAssinaturaResponsavelUrl(accessToken, doc.id);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const isSigned = doc.responsavelAssinadoEm != null;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setPdfLoaded(false);
    setPdfError('');
    setPdfUrl(null);

    api
      .get<Blob>(
        `/documentos/assinaturas/responsavel/${accessToken}/documentos/${doc.id}/view`,
        { responseType: 'blob' },
      )
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
        if (!cancelled) setPdfError('Não foi possível carregar o PDF.');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, accessToken]);

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
            <a href={pdfUrl ?? directUrl} download={`documento-responsavel-${doc.id}.pdf`}><Download className="h-4 w-4" />Baixar PDF</a>
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
          </object>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t bg-card p-4 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {isSigned ? 'Documento já assinado' : 'Leia o documento antes de assinar'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isSigned
              ? 'Assinatura do responsável legal registrada.'
              : 'Ao assinar, você confirma ciência e aceite como responsável legal.'}
          </p>
        </div>
        {isSigned ? (
          <Button type="button" variant="outline" onClick={onClose}>
            <CheckCircle2 className="h-4 w-4" /> Concluir
          </Button>
        ) : (
          <Button
            type="button"
            className="text-white hover:text-white"
            disabled={!pdfLoaded || isSigning}
            onClick={onSign}
          >
            {isSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            Assinar como responsável
          </Button>
        )}
      </div>
    </div>
  );
}
