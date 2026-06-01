import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
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
} from './documentos.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CPF_REGEX = /\b\d{3}[. -]?\d{3}[. -]?\d{3}[-. ]?\d{2}\b/;
const DATA_REGEX = /\b(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})\b/;

function parseCpf(text: string) {
  return text.match(CPF_REGEX)?.[0] ?? null;
}

function parseData(text: string) {
  const m = text.match(DATA_REGEX);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : null;
}

function keywordsEncontradas(doc: DocumentoAdmissao): string[] {
  if (!doc.ocrTexto || !doc.template?.palavrasChave.length) return [];
  const upper = doc.ocrTexto.toUpperCase();
  return doc.template.palavrasChave.filter((kw) => upper.includes(kw.toUpperCase()));
}

function isDispensado(doc: DocumentoAdmissao) {
  return doc.dispensadoPorId != null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CandidateDocumentosPage() {
  const [candidaturas, setCandidaturas] = useState<DocumentosCandidatura[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const doc = documentos[activeIndex] ?? documentos[0] ?? null;

  // Mantém activeIndex válido após reload
  useEffect(() => {
    if (activeIndex >= documentos.length && documentos.length > 0) {
      setActiveIndex(documentos.length - 1);
    }
  }, [documentos.length, activeIndex]);

  const uploadDocumento = async (file?: File) => {
    if (!file || !doc) return;

    const formData = new FormData();
    formData.append('file', file);
    setError('');
    setUploading(true);
    try {
      await api.post(`/documentos/candidato/${doc.id}/upload`, formData);
      await loadData();
    } catch {
      setError('Não foi possível enviar o documento.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeDocumento = async () => {
    if (!doc) return;
    if (!window.confirm(`Remover o arquivo de "${doc.nome}"?`)) return;

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

  const isBusy = uploading || removingId === doc?.id;
  const hasFile = Boolean(doc?.arquivoNome);
  const isPdf = doc?.mimeType === 'application/pdf';
  const canEdit = doc?.status !== 'APROVADO' && !isDispensado(doc!);

  // Documentos que ainda precisam de atenção (para contagem da barra)
  const pendentes = documentos.filter(
    (d) => !isDispensado(d) && d.status !== 'APROVADO',
  ).length;
  const total = documentos.filter((d) => !isDispensado(d)).length;

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => uploadDocumento(e.target.files?.[0])}
      />

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Admissão digital
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Seus documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCandidaturaTitle(candidatura)}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <ProgressoDocumentos pendentes={pendentes} total={total} documentos={documentos} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Document tabs ── */}
      <div className="flex flex-wrap gap-2">
        {documentos.map((documento, index) => (
          <DocumentoPill
            key={documento.id}
            documento={documento}
            isActive={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>

      {/* ── Two-column layout ── */}
      {doc && (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Left – preview or upload area */}
          <div className="overflow-hidden rounded-2xl border bg-muted/30">
            {hasFile && isPdf ? (
              <iframe
                src={getDocumentoUrl(doc.id)}
                title={doc.nome}
                className="h-[560px] w-full"
              />
            ) : hasFile && !isPdf ? (
              <div className="flex h-[560px] items-center justify-center p-6">
                <img
                  src={getDocumentoUrl(doc.id)}
                  alt={doc.nome}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-md"
                />
              </div>
            ) : (
              <UploadZone
                doc={doc}
                isBusy={isBusy}
                canEdit={canEdit}
                onSelectFile={() => fileInputRef.current?.click()}
              />
            )}
          </div>

          {/* Right – info + actions + OCR */}
          <div className="flex flex-col gap-4">
            {/* Doc info */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informações
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Documento</span>
                  <span className="text-right font-medium">{doc.nome}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Situação</span>
                  {isDispensado(doc) ? (
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Dispensado
                    </span>
                  ) : (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${documentoStatusTone[doc.status]}`}
                    >
                      {documentoStatusLabels[doc.status]}
                    </span>
                  )}
                </div>
                {!doc.obrigatorio && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Obrigatoriedade</span>
                    <span className="font-medium text-muted-foreground">Opcional</span>
                  </div>
                )}
                {doc.arquivoNome && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Arquivo</span>
                    <span className="max-w-[180px] break-all text-right font-medium">
                      {doc.arquivoNome}
                    </span>
                  </div>
                )}
                {doc.enviadoEm && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Enviado em</span>
                    <span className="font-medium">
                      {new Date(doc.enviadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {isDispensado(doc) && doc.dispensadoPor && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Dispensado via</span>
                    <span className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {doc.dispensadoPor.nome}
                    </span>
                  </div>
                )}
              </div>

              {/* Observação do RH */}
              {doc.observacaoRh && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive">Observação do RH</p>
                  <p className="mt-1 text-sm text-destructive">{doc.observacaoRh}</p>
                </div>
              )}
            </div>

            {/* OCR results */}
            {doc.ocrTexto && <OcrCard doc={doc} />}

            {/* Substitution hint */}
            {!isDispensado(doc) && doc.template?.substitui?.length === 0 && (
              <SubstituicaoHint doc={doc} documentos={documentos} />
            )}

            {/* Actions */}
            {!isDispensado(doc) && (
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ações
                </p>
                <div className="space-y-2">
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando e validando...
                        </>
                      ) : hasFile ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Reenviar arquivo
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Enviar arquivo
                        </>
                      )}
                    </Button>
                  )}
                  {hasFile && canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={removeDocumento}
                      className="w-full text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover arquivo
                    </Button>
                  )}
                  {doc.status === 'APROVADO' && (
                    <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Documento aprovado pelo RH
                    </div>
                  )}
                </div>

                {/* Formatos aceitos */}
                {canEdit && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Formatos aceitos: PDF, JPEG, PNG, WebP · Máx. 10 MB
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function DocumentoPill({
  documento,
  isActive,
  onClick,
}: {
  documento: DocumentoAdmissao;
  isActive: boolean;
  onClick: () => void;
}) {
  if (isActive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm"
      >
        {pillIcon(documento)}
        {documento.nome}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80 ${pillTone(documento)}`}
    >
      {pillIcon(documento)}
      {documento.nome}
    </button>
  );
}

function pillTone(doc: DocumentoAdmissao): string {
  if (isDispensado(doc)) return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  return documentoStatusTone[doc.status];
}

function pillIcon(doc: DocumentoAdmissao) {
  if (isDispensado(doc)) return <Zap className="h-3.5 w-3.5" />;
  if (doc.status === 'APROVADO') return <Check className="h-3.5 w-3.5" strokeWidth={3} />;
  if (doc.status === 'RECUSADO') return <XCircle className="h-3.5 w-3.5" />;
  if (doc.status === 'REENVIO_SOLICITADO') return <AlertCircle className="h-3.5 w-3.5" />;
  return null;
}

function UploadZone({
  doc,
  isBusy,
  canEdit,
  onSelectFile,
}: {
  doc: DocumentoAdmissao;
  isBusy: boolean;
  canEdit: boolean;
  onSelectFile: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  if (isDispensado(doc)) {
    return (
      <div className="flex h-[560px] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
        <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-10 dark:border-emerald-800 dark:bg-emerald-950/20">
          <Zap className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-semibold text-emerald-700 dark:text-emerald-400">
            Documento dispensado
          </p>
          <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-500">
            via {doc.dispensadoPor?.nome ?? 'outro documento'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-[560px] flex-col items-center justify-center gap-5 p-8 transition-colors ${
        isDragging ? 'bg-primary/5' : ''
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!canEdit || isBusy) return;
        const file = e.dataTransfer.files[0];
        if (file) onSelectFile();
      }}
    >
      <div className="rounded-2xl border-2 border-dashed border-border bg-muted/40 p-10 text-center transition-colors hover:border-primary/40">
        {isBusy ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-3 font-semibold">Enviando e validando...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Aguarde enquanto analisamos o documento
            </p>
          </>
        ) : (
          <>
            <ImageIcon className="mx-auto h-10 w-10 opacity-30" />
            <p className="mt-3 font-semibold">{doc.nome}</p>
            {doc.descricao && (
              <p className="mt-1 text-sm text-muted-foreground">{doc.descricao}</p>
            )}
            {canEdit && (
              <>
                <p className="mt-4 text-xs text-muted-foreground">
                  Arraste o arquivo aqui ou
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  onClick={onSelectFile}
                >
                  <Upload className="h-4 w-4" />
                  Selecionar arquivo
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  PDF, JPEG, PNG, WebP · máx. 10 MB
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OcrCard({ doc }: { doc: DocumentoAdmissao }) {
  if (!doc.ocrTexto) return null;

  const keywords = keywordsEncontradas(doc);
  const cpfDetectado = parseCpf(doc.ocrTexto);
  const dataDetectada = parseData(doc.ocrTexto);
  const reconhecido = keywords.length > 0;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Validação OCR
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <OcrItem
          ok={reconhecido}
          label={
            reconhecido
              ? `Tipo reconhecido: ${doc.nome}`
              : 'Tipo não reconhecido — verifique se o documento é o correto'
          }
        />

        {cpfDetectado && (
          <OcrItem ok label={`CPF detectado: ${formatCpf(cpfDetectado)}`} />
        )}

        {dataDetectada && (
          <OcrItem ok label={`Data detectada: ${dataDetectada}`} />
        )}

        {doc.dispensadoPorId == null && doc.template?.palavrasChave.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma palavra-chave configurada para validação automática.
          </p>
        )}
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

function SubstituicaoHint({
  doc,
  documentos,
}: {
  doc: DocumentoAdmissao;
  documentos: DocumentoAdmissao[];
}) {
  // Mostra documentos que PODEM substituir este
  const substituidores = documentos.filter((d) =>
    d.template?.substitui?.some((s) => s.substituidoTemplateId === doc.templateId),
  );

  if (substituidores.length === 0 || !doc.templateId) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-medium text-primary">Dica de substituição</p>
        <p className="mt-0.5 text-muted-foreground">
          Enviar{' '}
          <strong className="text-foreground">
            {substituidores.map((d) => d.nome).join(' ou ')}
          </strong>{' '}
          pode dispensar este documento automaticamente.
        </p>
      </div>
    </div>
  );
}

function formatCpf(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Acessa também DocumentosCandidatura.documentos que agora não tem templateId exposto,
// mas podemos comparar via dispensadoPorId da lógica de pills
