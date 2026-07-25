import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  ImageIcon,
  RotateCcw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import {
  type DocumentoAdmissao,
  type DocumentosCandidatura,
  type StatusDocumentoAdmissao,
  documentoStatusLabels,
  documentoStatusTone,
  formatCandidaturaTitle,
  getDocumentoUrl,
} from './documentos.model';

function getFileKind(doc: DocumentoAdmissao): 'image' | 'pdf' | 'other' {
  const mimeType = doc.mimeType?.toLowerCase() ?? '';
  const fileName = doc.arquivoNome?.toLowerCase() ?? '';

  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/x-pdf' ||
    fileName.endsWith('.pdf')
  ) {
    return 'pdf';
  }
  return 'other';
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocumentosRhPage() {
  const { id } = useParams();
  const candidatoId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [candidaturas, setCandidaturas] = useState<DocumentosCandidatura[]>([]);
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const { data } = await api.get<DocumentosCandidatura[]>('/documentos/rh');
    setCandidaturas(
      candidatoId ? data.filter((item) => item.candidato.id === candidatoId) : data,
    );
  }, [candidatoId]);

  useEffect(() => {
    loadData()
      .catch(() => setError('Não foi possível carregar os documentos.'))
      .finally(() => setIsLoading(false));
  }, [loadData]);

  const uploadDocumento = async (file?: File) => {
    if (!file || !selectedDocumentoId) return;
    const formData = new FormData();
    formData.append('file', file);
    setError('');
    setBusyId(selectedDocumentoId);
    try {
      await api.post(`/documentos/rh/${selectedDocumentoId}/upload`, formData);
      await loadData();
    } catch {
      setError('Não foi possível inserir o documento.');
    } finally {
      setBusyId(null);
      setSelectedDocumentoId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const revisarDocumento = async (
    documento: DocumentoAdmissao,
    status: StatusDocumentoAdmissao,
    observacaoRh?: string,
  ) => {
    setError('');
    setBusyId(documento.id);
    try {
      await api.patch(`/documentos/rh/${documento.id}/revisao`, { status, observacaoRh });
      await loadData();
    } catch {
      setError('Não foi possível revisar o documento.');
    } finally {
      setBusyId(null);
    }
  };

  const removeDocumento = async (documento: DocumentoAdmissao) => {
    setError('');
    setBusyId(documento.id);
    try {
      await api.delete(`/documentos/rh/${documento.id}`);
      await loadData();
    } catch {
      setError('Não foi possível remover o documento.');
    } finally {
      setBusyId(null);
    }
  };

  const triggerUpload = (documentoId: number) => {
    setSelectedDocumentoId(documentoId);
    fileInputRef.current?.click();
  };

  // ── Focused per-candidate view ───────────────────────────────────────────
  if (candidatoId) {
    const candidatura = candidaturas[0] ?? null;

    return (
      <>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => uploadDocumento(e.target.files?.[0])}
        />

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Carregando documentos...
          </div>
        ) : !candidatura ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 opacity-40" />
            <p>Nenhum documento encontrado para este candidato.</p>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        ) : (
          <CandidatoRevisao
            candidatura={candidatura}
            busyId={busyId}
            error={error}
            onUpload={triggerUpload}
            onRevisar={revisarDocumento}
            onRemove={removeDocumento}
            onBack={() => navigate(-1)}
          />
        )}
      </>
    );
  }

  // ── Generic all-candidates list view ─────────────────────────────────────
  return (
    <>
      <PageHeader
        eyebrow="Entrega de documentos"
        title="Documentos enviados"
        description="Confira arquivos enviados pelo candidato, aprove, recuse, solicite reenvio ou insira arquivos pelo RH."
      />

      <section className="relative overflow-hidden rounded-[1.75rem] border bg-card p-4 sm:p-6">
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => uploadDocumento(e.target.files?.[0])}
        />

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Carregando documentos...
            </CardContent>
          </Card>
        ) : candidaturas.length === 0 ? (
          <Card className="border-dashed text-center">
            <CardContent className="p-8 text-sm text-muted-foreground">
              Nenhuma candidatura com documentos encontrada.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidaturas.map((candidatura) => (
              <article key={candidatura.id} className="rounded-2xl border bg-background/90 p-4">
                <div className="mb-4 flex flex-col gap-1">
                  <h2 className="font-display text-lg font-semibold">
                    {candidatura.candidato.nome ?? candidatura.candidato.cpf}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatCandidaturaTitle(candidatura)}
                  </p>
                </div>
                <div className="grid gap-3">
                  {candidatura.documentos.map((documento) => (
                    <DocumentoRhRow
                      key={documento.id}
                      documento={documento}
                      isBusy={busyId === documento.id}
                      onApprove={() => revisarDocumento(documento, 'APROVADO')}
                      onReject={() => {
                        const obs = window.prompt('Informe a observação para o candidato:')?.trim();
                        if (obs) revisarDocumento(documento, 'RECUSADO', obs);
                      }}
                      onRemove={() => {
                        if (window.confirm(`Remover o arquivo de "${documento.nome}"?`))
                          removeDocumento(documento);
                      }}
                      onRequestResubmit={() => {
                        const obs = window.prompt('Informe a observação para o candidato:')?.trim();
                        if (obs) revisarDocumento(documento, 'REENVIO_SOLICITADO', obs);
                      }}
                      onUpload={() => triggerUpload(documento.id)}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ─── Focused per-candidate review component ───────────────────────────────────

function CandidatoRevisao({
  candidatura,
  busyId,
  error,
  onUpload,
  onRevisar,
  onRemove,
  onBack,
}: {
  candidatura: DocumentosCandidatura;
  busyId: number | null;
  error: string;
  onUpload: (id: number) => void;
  onRevisar: (doc: DocumentoAdmissao, status: StatusDocumentoAdmissao, obs?: string) => void;
  onRemove: (doc: DocumentoAdmissao) => void;
  onBack: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [formError, setFormError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const prevBlobRef = useRef<string | null>(null);

  const documentos = candidatura.documentos;
  const doc = documentos[activeIndex] ?? documentos[0];

  useEffect(() => {
    setObservacao(doc?.observacaoRh ?? '');
    setFormError('');
  }, [activeIndex, doc?.observacaoRh]);

  useEffect(() => {
    if (!doc?.arquivoNome) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    setPreviewUrl(null);
    setPreviewLoading(true);

    api
      .get<Blob>(`/documentos/${doc.id}/view`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
        // Garante MIME type explícito para o browser renderizar inline
        const mimeType = res.data.type || doc.mimeType || 'application/octet-stream';
        const blob = res.data.type ? res.data : new Blob([res.data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        prevBlobRef.current = url;
        setPreviewUrl(url);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doc?.id, doc?.arquivoNome, doc?.mimeType]);

  useEffect(
    () => () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    },
    [],
  );

  if (!doc) return null;

  const nomeEmpresa = candidatura.requisicao.empresa?.nome ?? 'Empresa não informada';
  const nomeCandidato = candidatura.candidato.nome ?? candidatura.candidato.cpf;
  const hasFile = Boolean(doc.arquivoNome);
  const fileKind = getFileKind(doc);
  const isBusy = busyId === doc.id;

  const handleRevisar = async (status: StatusDocumentoAdmissao) => {
    if (['RECUSADO', 'REENVIO_SOLICITADO'].includes(status) && !observacao.trim()) {
      setFormError('Informe uma observação para o candidato.');
      return;
    }
    setFormError('');
    onRevisar(doc, status, observacao.trim() || undefined);
  };

  const handleRemove = () => {
    if (window.confirm(`Remover o arquivo de "${doc.nome}"?`)) {
      onRemove(doc);
    }
  };

  const pillStyle = (documento: DocumentoAdmissao, isActive: boolean) => {
    if (isActive) {
      return 'border-primary bg-primary text-primary-foreground shadow-sm';
    }
    return `${documentoStatusTone[documento.status]} cursor-pointer hover:opacity-80 transition-opacity`;
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight">{nomeCandidato}</h1>
            <p className="text-sm text-muted-foreground">
              {nomeEmpresa} · doc {activeIndex + 1} de {documentos.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Document tabs ── */}
      <div className="flex flex-wrap gap-2">
        {documentos.map((documento, index) => (
          <button
            key={documento.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${pillStyle(documento, index === activeIndex)}`}
          >
            {documento.status === 'APROVADO' && (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            )}
            {documento.nome}
          </button>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left – Document preview */}
        <div className="overflow-hidden rounded-2xl border bg-muted/30">
          {hasFile && previewLoading ? (
            <div className="flex h-[620px] items-center justify-center text-sm text-muted-foreground">
              Carregando documento...
            </div>
          ) : hasFile && fileKind === 'pdf' ? (
            <embed
              src={previewUrl ?? ''}
              type="application/pdf"
              className="h-[620px] w-full"
            />
          ) : hasFile && fileKind === 'image' ? (
            <div className="flex h-[620px] items-center justify-center p-4">
              <img
                src={previewUrl ?? ''}
                alt={doc.nome}
                className="max-h-full max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          ) : hasFile ? (
            <div className="flex h-[620px] flex-col items-center justify-center gap-4 p-6 text-center text-muted-foreground">
              <div className="rounded-2xl border-2 border-dashed border-border bg-background/70 p-8">
                <FileText className="mx-auto h-12 w-12 opacity-40" />
                <p className="mt-4 text-sm font-semibold text-foreground">Prévia indisponível</p>
                <p className="mt-1 max-w-md text-sm">
                  Este tipo de arquivo não pode ser exibido embutido. Abra o documento em uma nova
                  aba para validar o conteúdo.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-5" asChild>
                  <a href={getDocumentoUrl(doc.id)} target="_blank" rel="noreferrer">
                    <Eye className="h-4 w-4" />
                    Abrir documento
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-[620px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="rounded-2xl border-2 border-dashed border-border p-8">
                <ImageIcon className="mx-auto h-10 w-10 opacity-30" />
                <p className="mt-3 text-center text-sm">
                  [{doc.nome.toLowerCase()} · sem arquivo]
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right – Info + Review */}
        <div className="flex flex-col gap-4">
          {/* Document info card */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Informações do documento
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground">Documento</span>
                <span className="text-right font-medium">{doc.nome}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${documentoStatusTone[doc.status]}`}
                >
                  {documentoStatusLabels[doc.status]}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground">Arquivo</span>
                <span className="text-right font-medium">
                  {doc.arquivoNome ?? (
                    <span className="italic text-muted-foreground">Sem arquivo</span>
                  )}
                </span>
              </div>
              {doc.enviadoEm && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Enviado em</span>
                  <span className="font-medium">
                    {new Date(doc.enviadoEm).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {doc.origem && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Origem</span>
                  <span className="font-medium">
                    {doc.origem === 'CANDIDATO' ? 'Candidato' : 'RH'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Review card */}
          <div className="flex flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revisão
            </p>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground" htmlFor="observacao-rh">
                  Observação (opcional)
                </label>
                <textarea
                  id="observacao-rh"
                  value={observacao}
                  onChange={(e) => {
                    setObservacao(e.target.value);
                    setFormError('');
                  }}
                  rows={4}
                  placeholder="Informe orientações ou motivo da recusa..."
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  disabled={isBusy}
                />
                {formError && <p className="text-xs text-destructive">{formError}</p>}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => onUpload(doc.id)}
                className="w-full"
              >
                <Upload className="h-4 w-4" />
                Inserir arquivo
              </Button>

              {hasFile && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={getDocumentoUrl(doc.id)} target="_blank" rel="noreferrer">
                    <Eye className="h-4 w-4" />
                    Abrir em nova aba
                  </a>
                </Button>
              )}

              <div className="mt-auto space-y-2 pt-1">
                {hasFile && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleRevisar('APROVADO')}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isBusy ? 'Salvando...' : 'Aprovar'}
                  </Button>
                )}
                {hasFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleRevisar('REENVIO_SOLICITADO')}
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Solicitar reenvio
                  </Button>
                )}
                {hasFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleRevisar('RECUSADO')}
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar
                  </Button>
                )}
                {hasFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={handleRemove}
                    className="w-full text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover arquivo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic list row (used in the all-candidates view) ───────────────────────

function DocumentoRhRow({
  documento,
  isBusy,
  onApprove,
  onReject,
  onRemove,
  onRequestResubmit,
  onUpload,
}: {
  documento: DocumentoAdmissao;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
  onRequestResubmit: () => void;
  onUpload: () => void;
}) {
  const hasFile = Boolean(documento.arquivoNome);

  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="font-semibold">{documento.nome}</p>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${documentoStatusTone[documento.status]}`}
          >
            {documentoStatusLabels[documento.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {documento.arquivoNome ? `Arquivo: ${documento.arquivoNome}` : documento.descricao}
        </p>
        {documento.observacaoRh && (
          <p className="mt-1 text-xs text-destructive">Observação: {documento.observacaoRh}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        {hasFile && (
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={getDocumentoUrl(documento.id)} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              Ver
            </a>
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Inserir
        </Button>
        {hasFile && (
          <>
            <Button type="button" size="sm" disabled={isBusy} onClick={onApprove}>
              <CheckCircle2 className="h-4 w-4" />
              Aprovar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={onRequestResubmit}
            >
              <RotateCcw className="h-4 w-4" />
              Reenvio
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onReject}>
              <XCircle className="h-4 w-4" />
              Recusar
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
