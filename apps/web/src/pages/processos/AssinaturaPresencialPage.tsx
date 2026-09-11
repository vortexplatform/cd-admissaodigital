import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import SignaturePad from 'signature_pad';
import { Camera, CheckCircle2, ChevronLeft, Eye, Loader2, PenLine, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { getDocumentoAssinaturaRhUrl } from './documentos.model';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type Documento = { id: number; nome: string; status: 'PENDENTE' | 'ASSINADO_NA_SESSAO' };
type Sessao = {
  id: number;
  status: 'EM_ANDAMENTO' | 'CONCLUIDA' | 'EXPIRADA';
  expiraEm: string;
  fotoCapturada: boolean;
  tipoSignatario: 'CANDIDATO' | 'RESPONSAVEL';
  signatarioNome: string | null;
  documentos: Documento[];
};
type Ponto = { pagina: number; x: number; y: number; largura: number; altura: number };

export default function AssinaturaPresencialPage() {
  const { envelopeId } = useParams<{ envelopeId: string }>();
  const navigate = useNavigate();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [documentoAtual, setDocumentoAtual] = useState<Documento | null>(null);
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraPronta, setCameraPronta] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadSession = async (id: number) => {
    const { data } = await api.get<Sessao>(`/documentos/assinaturas/presencial/sessoes/${id}`);
    setSessao(data);
  };

  useEffect(() => {
    if (!envelopeId) return;
    api
      .post<Sessao>(`/documentos/assinaturas/presencial/envelopes/${envelopeId}/iniciar`)
      .then(({ data }) => {
        setSessao(data);
      })
      .catch(() => setError('Não foi possível iniciar a assinatura presencial.'))
      .finally(() => setLoading(false));
  }, [envelopeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ponto) return;
    const pad = new SignaturePad(canvas, {
      minWidth: 1,
      maxWidth: 2.5,
      penColor: '#000000',
    });
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.clear();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    padRef.current = pad;
    return () => {
      observer.disconnect();
      pad.off();
      padRef.current = null;
    };
  }, [ponto]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraAtiva || !video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => setError('Não foi possível iniciar a visualização da câmera.'));
  }, [cameraAtiva]);

  const selecionarLocal = (pagina: number) => {
    if (!documentoAtual || documentoAtual.status !== 'PENDENTE' || !sessao) return;
    const responsavel = sessao.tipoSignatario === 'RESPONSAVEL';
    setPonto({ pagina, x: responsavel ? 0.08 : 0.57, y: 0.82, largura: 0.35, altura: 0.1 });
  };

  const salvarAssinatura = async () => {
    if (!sessao || !documentoAtual || !ponto || !padRef.current || padRef.current.isEmpty()) {
      setError('Toque no local do PDF e faça a assinatura antes de confirmar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const blob = await (await fetch(padRef.current.toDataURL('image/png'))).blob();
      const form = new FormData();
      form.append('assinatura', blob, 'assinatura.png');
      Object.entries(ponto).forEach(([key, value]) => form.append(key, String(value)));
      await api.post(
        `/documentos/assinaturas/presencial/sessoes/${sessao.id}/documentos/${documentoAtual.id}`,
        form,
      );
      setPonto(null);
      setDocumentoAtual(null);
      await loadSession(sessao.id);
    } catch {
      setError('Não foi possível salvar a assinatura.');
    } finally {
      setSaving(false);
    }
  };

  const abrirCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('A câmera exige acesso por HTTPS e um navegador compatível.');
      return;
    }

    setError('');
    setCameraPronta(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraAtiva(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Permita o uso da câmera nas configurações do navegador para continuar.'
          : name === 'NotFoundError'
            ? 'Nenhuma câmera foi encontrada neste tablet.'
            : 'Não foi possível acessar a câmera do tablet.',
      );
    }
  };

  const capturarFoto = async () => {
    if (!sessao || !videoRef.current || !cameraPronta) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (!blob) return setError('Não foi possível capturar a foto.');
    setSaving(true);
    try {
      const form = new FormData();
      form.append('foto', blob, 'foto-assinatura.jpg');
      await api.post(`/documentos/assinaturas/presencial/sessoes/${sessao.id}/foto`, form);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraAtiva(false);
      setCameraPronta(false);
      await loadSession(sessao.id);
    } catch {
      setError('Não foi possível salvar a foto.');
    } finally {
      setSaving(false);
    }
  };

  const concluir = async () => {
    if (!sessao) return;
    setSaving(true);
    try {
      await api.post(`/documentos/assinaturas/presencial/sessoes/${sessao.id}/concluir`);
      await loadSession(sessao.id);
    } catch {
      setError('Não foi possível concluir a assinatura presencial.');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando sessão...
      </div>
    );
  if (!sessao) return <div className="p-6 text-destructive">{error}</div>;
  const documentosPendentes = sessao.documentos.filter(
    (documento) => documento.status === 'PENDENTE',
  );

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">Assinatura presencial</p>
          <h1 className="text-headline text-foreground">{sessao.signatarioNome ?? 'Signatário'}</h1>
          <p className="text-body-sm text-muted-foreground">
            {sessao.documentos.length - documentosPendentes.length}/{sessao.documentos.length}{' '}
            documentos assinados
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      </header>
      {error && (
        <p className="mx-auto mt-4 max-w-6xl rounded-md border border-destructive/30 bg-card p-3 text-body-sm text-destructive">
          {error}
        </p>
      )}

      {documentoAtual ? (
        <section className="mx-auto mt-5 max-w-6xl rounded-lg border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-headline text-foreground">{documentoAtual.nome}</h2>
              <p className="text-body-sm text-muted-foreground">
                Leia o documento antes de iniciar a assinatura.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDocumentoAtual(null);
                  setPonto(null);
                }}
              >
                Voltar aos documentos
              </Button>
            </div>
          </div>
          <PdfParaAssinatura
            documento={documentoAtual}
            ponto={ponto}
            tipoSignatario={sessao.tipoSignatario}
            onSelecionar={selecionarLocal}
          />
          {ponto && (
            <div className="mt-4 rounded-md border bg-background p-4">
              <p className="text-body-sm font-medium text-foreground">Assine com a caneta</p>
              <canvas ref={canvasRef} className="mt-3 h-40 w-full touch-none rounded-sm bg-card" />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => padRef.current?.clear()}>
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </Button>
                <Button disabled={saving} onClick={salvarAssinatura}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PenLine className="h-4 w-4" />
                  )}
                  Finalizar assinatura
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : documentosPendentes.length > 0 ? (
        <section className="mx-auto mt-5 max-w-4xl rounded-lg border bg-card p-4">
          <h2 className="text-headline text-foreground">Documentos para assinatura</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Selecione um documento, leia-o e escolha quando iniciar sua assinatura manuscrita.
          </p>
          <div className="mt-4 space-y-3">
            {sessao.documentos.map((documento) => {
              const assinado = documento.status === 'ASSINADO_NA_SESSAO';
              return (
                <div
                  key={documento.id}
                  className="flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{documento.nome}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {assinado ? 'Assinatura registrada nesta sessão' : 'Aguardando assinatura'}
                    </p>
                  </div>
                  {assinado ? (
                    <span className="inline-flex items-center gap-2 text-body-sm font-medium text-primary">
                      <CheckCircle2 className="h-4 w-4" /> Assinado
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setDocumentoAtual(documento);
                        setPonto(null);
                      }}
                    >
                      <Eye className="h-4 w-4" /> Visualizar e assinar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : !sessao.fotoCapturada ? (
        <section className="mx-auto mt-8 max-w-xl rounded-lg border bg-card p-6 text-center">
          <Camera className="mx-auto h-9 w-9 text-muted-foreground" />
          <h2 className="mt-3 text-headline text-foreground">Registrar foto do signatário</h2>
          <p className="mt-2 text-body-sm text-muted-foreground">
            A foto será inserida como evidência em cada PDF assinado.
          </p>
          {cameraAtiva ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setCameraPronta(true)}
                className="mx-auto mt-4 max-h-80 rounded-md"
              />
              <Button className="mt-4" disabled={saving || !cameraPronta} onClick={capturarFoto}>
                <Camera className="h-4 w-4" />
                Capturar foto
              </Button>
            </>
          ) : (
            <Button className="mt-4" onClick={abrirCamera}>
              <Camera className="h-4 w-4" />
              Abrir câmera
            </Button>
          )}
        </section>
      ) : (
        <section className="mx-auto mt-8 max-w-xl rounded-lg border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-3 text-headline text-foreground">Pronto para concluir</h2>
          <p className="mt-2 text-body-sm text-muted-foreground">
            As assinaturas e a foto serão inseridas definitivamente nos PDFs.
          </p>
          <Button
            className="mt-4"
            disabled={saving || sessao.status === 'CONCLUIDA'}
            onClick={concluir}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {sessao.status === 'CONCLUIDA' ? 'Concluído' : 'Concluir assinatura'}
          </Button>
        </section>
      )}
    </main>
  );
}

function PdfParaAssinatura({
  documento,
  ponto,
  tipoSignatario,
  onSelecionar,
}: {
  documento: Documento;
  ponto: Ponto | null;
  tipoSignatario: Sessao['tipoSignatario'];
  onSelecionar: (pagina: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paginas, setPaginas] = useState(0);
  const [width, setWidth] = useState(0);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setWidth(Math.floor(container.clientWidth));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, [documento.id]);

  return (
    <div ref={containerRef} className="min-h-full w-full overflow-auto p-3">
      {pdfError ? (
        <div className="p-8 text-center text-body-sm text-destructive">{pdfError}</div>
      ) : (
        width > 0 && (
          <Document
            file={getDocumentoAssinaturaRhUrl(documento.id)}
            options={{ withCredentials: true }}
            onLoadSuccess={({ numPages }) => setPaginas(numPages)}
            onLoadError={() => setPdfError('Não foi possível carregar este documento para assinatura.')}
            loading={
              <div className="p-8 text-center text-body-sm text-muted-foreground">
                Renderizando PDF...
              </div>
            }
          >
            {Array.from({ length: paginas }, (_, index) => (
              <div
                key={index}
                className="relative mx-auto mb-4 w-fit"
              >
                <Page
                  pageNumber={index + 1}
                  width={Math.max(width - 24, 1)}
                  className="bg-white shadow-sm"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderError={() => setPdfError('Não foi possível renderizar este documento.')}
                />
                {documento.status === 'PENDENTE' && !ponto && (
                  <Button
                    size="sm"
                    className={`absolute bottom-6 ${tipoSignatario === 'RESPONSAVEL' ? 'left-6' : 'right-6'}`}
                    onClick={() => onSelecionar(index + 1)}
                  >
                    <PenLine className="h-4 w-4" />
                    Toque para assinar
                  </Button>
                )}
              </div>
            ))}
          </Document>
        )
      )}
    </div>
  );
}
