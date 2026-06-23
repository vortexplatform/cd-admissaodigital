import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  type DocumentoAdmissao,
  type DocumentosCandidatura,
  documentoStatusLabels,
  documentoStatusTone,
  formatCandidaturaTitle,
  getDocumentoUrl,
} from '../processos/documentos.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CPF_REGEX = /\b\d{3}[. -]?\d{3}[. -]?\d{3}[-. ]?\d{2}\b/;
const DATA_REGEX = /\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b/;

function parseCpf(text: string) { return text.match(CPF_REGEX)?.[0] ?? null; }
function parseData(text: string) {
  const m = text.match(DATA_REGEX);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : null;
}
function isDispensado(doc: DocumentoAdmissao) { return doc.dispensadoPorId != null; }
function formatCpf(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CandidateDocumentosPage() {
  const [candidaturas, setCandidaturas] = useState<DocumentosCandidatura[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentoAdmissao | null>(null);
  const [mismatchState, setMismatchState] = useState<{
    file: File;
    doc: DocumentoAdmissao;
    url: string;
    reason: string;
  } | null>(null);
  const [mismatchObservacao, setMismatchObservacao] = useState('');
  const [mismatchSubmitting, setMismatchSubmitting] = useState(false);
  const [mismatchError, setMismatchError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<DocumentoAdmissao | null>(null);

  const loadData = async () => {
    const { data } = await api.get<DocumentosCandidatura[]>('/documentos/candidato');
    setCandidaturas(data);
  };

  useEffect(() => {
    loadData()
      .catch(() => setError('Não foi possível carregar seus documentos.'))
      .finally(() => setIsLoading(false));
  }, []);

  const candidatura = candidaturas[0] ?? null;
  const documentos = candidatura?.documentos ?? [];

  const triggerUpload = (doc: DocumentoAdmissao) => {
    uploadTargetRef.current = doc;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const buildUploadUrl = (doc: DocumentoAdmissao) => {
    if (doc.id === 0) {
      const params = new URLSearchParams({ candidaturaId: String(candidatura!.id) });
      if (doc.templateId != null) params.set('templateId', String(doc.templateId));
      else params.set('codigo', doc.codigo);
      return `/documentos/candidato/0/upload?${params.toString()}`;
    }
    return `/documentos/candidato/${doc.id}/upload`;
  };

  const uploadDocumento = async (file: File) => {
    const doc = uploadTargetRef.current;
    if (!file || !doc || !candidatura) return;

    const formData = new FormData();
    formData.append('file', file);
    setError('');
    setUploading(true);

    const url = buildUploadUrl(doc);

    try {
      await api.post(url, formData);
      await loadData();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (errData?.code === 'DOCUMENTO_SUSPEITO' || errData?.code === 'DOCUMENTO_NAO_CORRESPONDE') {
        setMismatchState({
          file,
          doc,
          url,
          reason: errData.message ?? 'O OCR não conseguiu confirmar que este é o documento solicitado.',
        });
        setMismatchObservacao('');
        setMismatchError('');
        return;
      }
      const msg = errData?.message;
      setError(typeof msg === 'string' ? msg : 'Não foi possível enviar o documento.');
    } finally {
      setUploading(false);
    }
  };

  const confirmarUpload = async () => {
    if (!mismatchState) return;
    const { file, url } = mismatchState;
    const formData = new FormData();
    formData.append('file', file);
    const [basePath, existingSearch] = url.split('?');
    const params = new URLSearchParams(existingSearch ?? '');
    params.set('confirmarEnvio', 'true');
    params.set('observacaoCandidato', mismatchObservacao.trim());
    setMismatchSubmitting(true);
    setMismatchError('');
    try {
      await api.post(`${basePath}?${params.toString()}`, formData);
      setMismatchState(null);
      setMismatchObservacao('');
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMismatchError(typeof msg === 'string' ? msg : 'Não foi possível enviar o documento.');
    } finally {
      setMismatchSubmitting(false);
    }
  };

  const removeDocumento = async (doc: DocumentoAdmissao) => {
    if (!doc.id || !window.confirm(`Remover o arquivo de "${doc.nome}"?`)) return;
    setError('');
    setRemovingId(doc.id);
    try {
      await api.delete(`/documentos/candidato/${doc.id}`);
      await loadData();
    } catch {
      setError('Não foi possível remover o documento.');
    } finally {
      setRemovingId(null);
    }
  };

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando documentos...
      </div>
    );
  }

  if (!candidatura) {
    return (
      <div className="space-y-3">
        <PageTitle />
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum processo de admissão encontrado para seu usuário.
        </div>
      </div>
    );
  }

  const pendentes = documentos.filter((d) => !isDispensado(d) && d.status !== 'APROVADO').length;
  const total = documentos.filter((d) => !isDispensado(d)).length;

  return (
    <>
      <div className="space-y-5">
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadDocumento(file);
          }}
        />

        {/* ── Header ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Admissão digital
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Seus documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatCandidaturaTitle(candidatura)}</p>
        </div>

        {/* ── Progress bar ── */}
        <ProgressoDocumentos pendentes={pendentes} total={total} documentos={documentos} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* ── Document cards ── */}
        <div className="space-y-3">
          {documentos.map((doc) => (
            <DocumentoCard
              key={doc.id === 0 ? `virtual-${doc.codigo}` : doc.id}
              doc={doc}
              isUploading={uploading && uploadTargetRef.current?.codigo === doc.codigo}
              isRemoving={removingId === doc.id}
              onUpload={triggerUpload}
              onRemove={removeDocumento}
              onPreview={setPreviewDoc}
            />
          ))}
        </div>

      </div>

      {/* ── Preview modal ── */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* ── Mismatch modal ── */}
      {mismatchState && (
        <MismatchModal
          documentoNome={mismatchState.doc.nome}
          reason={mismatchState.reason}
          observacao={mismatchObservacao}
          onObservacaoChange={setMismatchObservacao}
          errorMessage={mismatchError}
          isSubmitting={mismatchSubmitting}
          onCancel={() => {
            setMismatchState(null);
            setMismatchObservacao('');
            setMismatchError('');
          }}
          onConfirm={confirmarUpload}
        />
      )}
    </>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocumentoCard({
  doc,
  isUploading,
  isRemoving,
  onUpload,
  onRemove,
  onPreview,
}: {
  doc: DocumentoAdmissao;
  isUploading: boolean;
  isRemoving: boolean;
  onUpload: (doc: DocumentoAdmissao) => void;
  onRemove: (doc: DocumentoAdmissao) => void;
  onPreview: (doc: DocumentoAdmissao) => void;
}) {
  const dispensado = isDispensado(doc);
  const hasFile = Boolean(doc.arquivoNome);
  const canEdit = doc.status !== 'APROVADO' && !dispensado;
  const isBusy = isUploading || isRemoving;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* ── Top row: name + status ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cardIconBg(doc)}`}>
            <CardIcon doc={doc} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{doc.nome}</p>
            {doc.descricao && (
              <p className="mt-0.5 text-sm text-muted-foreground">{doc.descricao}</p>
            )}
          </div>
        </div>

        {dispensado ? (
          <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Dispensado
          </span>
        ) : (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${documentoStatusTone[doc.status]}`}>
            {documentoStatusLabels[doc.status]}
          </span>
        )}
      </div>

      {/* ── File info ── */}
      {hasFile && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{doc.arquivoNome}</span>
          {doc.enviadoEm && (
            <span className="shrink-0">· {new Date(doc.enviadoEm).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      )}

      {/* ── Dispensado via ── */}
      {dispensado && doc.dispensadoPor && (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Zap className="mr-1 inline h-3.5 w-3.5" />
          Dispensado via <strong>{doc.dispensadoPor.nome}</strong>
        </p>
      )}

      {/* ── RH observation ── */}
      {doc.observacaoRh && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-semibold text-destructive">Observação do RH</p>
          <p className="mt-1 text-sm text-destructive">{doc.observacaoRh}</p>
        </div>
      )}

      {/* ── OCR compact ── */}
      {(doc.ocrTexto || doc.ocrResultado) && <OcrCompact doc={doc} />}

      {/* ── Actions ── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {hasFile && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPreview(doc)}
          >
            <Eye className="h-4 w-4" />
            Visualizar documento
          </Button>
        )}

        {canEdit && (
          <Button
            type="button"
            size="sm"
            disabled={isBusy}
            onClick={() => onUpload(doc)}
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
            ) : hasFile ? (
              <><RotateCcw className="h-4 w-4" />Reenviar</>
            ) : (
              <><Upload className="h-4 w-4" />Enviar arquivo</>
            )}
          </Button>
        )}

        {hasFile && canEdit && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => onRemove(doc)}
            className="text-muted-foreground hover:text-destructive"
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}

        {!canEdit && !dispensado && !hasFile && (
          <p className="text-sm text-muted-foreground">
            {doc.status === 'APROVADO' ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Aprovado pelo RH
              </span>
            ) : null}
          </p>
        )}
      </div>

      {/* ── Format hint (only when no file and can edit) ── */}
      {canEdit && !hasFile && (
        <p className="mt-2 text-xs text-muted-foreground">
          Formatos aceitos: PDF, JPEG, PNG, WebP · Máx. 10 MB
        </p>
      )}
    </div>
  );
}

// ─── Mismatch modal ───────────────────────────────────────────────────────────

function MismatchModal({
  documentoNome,
  reason,
  observacao,
  onObservacaoChange,
  errorMessage,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  documentoNome: string;
  reason: string;
  observacao: string;
  onObservacaoChange: (v: string) => void;
  errorMessage: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = observacao.trim().length >= 10 && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-snug">Documento precisa de justificativa</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O Google OCR não confirmou totalmente que o arquivo enviado é{' '}
              <strong className="text-foreground">{documentoNome}</strong>.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          {reason}
        </div>

        <div className="mt-5 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Selecionar outro arquivo
          </Button>

          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">Ou confirme com uma observação:</p>
            <p className="text-xs text-muted-foreground">
              Explique por que este documento é adequado para esta solicitação. O RH verá essa justificativa na conferência.
            </p>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Ex: Este documento contém meu novo CPF que substitui o anterior..."
              value={observacao}
              onChange={(e) => onObservacaoChange(e.target.value)}
              disabled={isSubmitting}
            />
            {observacao.trim().length > 0 && observacao.trim().length < 10 && (
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres ({observacao.trim().length}/10)
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                'Enviar para conferência do RH'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }: { doc: DocumentoAdmissao; onClose: () => void }) {
  const url = getDocumentoUrl(doc.id);
  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="truncate font-semibold">{doc.nome}</p>
          {doc.arquivoNome && (
            <span className="hidden truncate text-sm text-muted-foreground sm:block">
              · {doc.arquivoNome}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
          Fechar
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30">
        {isPdf ? (
          <iframe
            src={url}
            title={doc.nome}
            className="h-full w-full"
          />
        ) : (
          <div className="flex min-h-full items-center justify-center p-6">
            <img
              src={url}
              alt={doc.nome}
              className="max-h-[calc(100vh-56px)] max-w-full rounded-xl object-contain shadow-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressoDocumentos({
  pendentes,
  total,
  documentos,
}: {
  pendentes: number;
  total: number;
  documentos: DocumentoAdmissao[];
}) {
  const aprovados = documentos.filter((d) => d.status === 'APROVADO').length;
  const dispensados = documentos.filter(isDispensado).length;
  const concluidos = aprovados + dispensados;
  const progress = total === 0 ? 100 : Math.round((concluidos / documentos.length) * 100);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">
          {pendentes === 0
            ? 'Todos os documentos concluídos!'
            : `${pendentes} documento${pendentes > 1 ? 's' : ''} aguardando envio`}
        </span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {aprovados > 0 && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {aprovados} aprovado{aprovados > 1 ? 's' : ''}
          </span>
        )}
        {dispensados > 0 && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Zap className="h-3 w-3" />
            {dispensados} dispensado{dispensados > 1 ? 's' : ''}
          </span>
        )}
        {pendentes > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pendentes} pendente{pendentes > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── OCR compact ─────────────────────────────────────────────────────────────

function OcrCompact({ doc }: { doc: DocumentoAdmissao }) {
  if (!doc.ocrTexto && !doc.ocrResultado) return null;
  const keywords = (doc.template?.palavrasChave ?? []).filter((kw) =>
    doc.ocrTexto?.toUpperCase().includes(kw.toUpperCase()),
  );
  const cpf = doc.ocrTexto ? parseCpf(doc.ocrTexto) : null;
  const data = doc.ocrTexto ? parseData(doc.ocrTexto) : null;
  const reconhecido = keywords.length > 0;
  const statusLabel = doc.ocrResultado
    ? `Resultado: ${doc.ocrResultado.toLowerCase()}${doc.ocrScore != null ? ` (${doc.ocrScore}/100)` : ''}`
    : null;

  return (
    <div className="mt-3 rounded-xl border bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Validação OCR
        </p>
      </div>
      <div className="space-y-1 text-sm">
        {statusLabel && <OcrItem ok={doc.ocrResultado === 'VALIDO'} label={statusLabel} />}
        <OcrItem
          ok={reconhecido}
          label={reconhecido ? `Tipo reconhecido: ${doc.nome}` : 'Tipo não reconhecido — verifique o documento'}
        />
        {cpf && <OcrItem ok label={`CPF detectado: ${formatCpf(cpf)}`} />}
        {data && <OcrItem ok label={`Data detectada: ${data}`} />}
        {doc.ocrMotivos?.slice(0, 2).map((motivo) => (
          <OcrItem key={motivo} ok={doc.ocrResultado === 'VALIDO'} label={motivo} />
        ))}
      </div>
    </div>
  );
}

function OcrItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span className={ok ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

// ─── Card visual helpers ──────────────────────────────────────────────────────

function cardIconBg(doc: DocumentoAdmissao): string {
  if (isDispensado(doc)) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400';
  const map: Record<string, string> = {
    PENDENTE: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    ENVIADO: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
    EM_ANALISE: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
    APROVADO: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    RECUSADO: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
    REENVIO_SOLICITADO: 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400',
  };
  return map[doc.status] ?? map.PENDENTE;
}

function CardIcon({ doc }: { doc: DocumentoAdmissao }) {
  if (isDispensado(doc)) return <Zap className="h-4 w-4" />;
  if (doc.status === 'APROVADO') return <CheckCircle2 className="h-4 w-4" />;
  if (doc.status === 'RECUSADO') return <XCircle className="h-4 w-4" />;
  if (doc.status === 'REENVIO_SOLICITADO') return <AlertCircle className="h-4 w-4" />;
  if (doc.status === 'EM_ANALISE') return <Clock className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function PageTitle() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Admissão digital
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Seus documentos</h1>
    </div>
  );
}
