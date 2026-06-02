import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Eye,
  FileSignature,
  Loader2,
  PenLine,
  ShieldCheck,
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
  const obrigatorios = candidatura.documentos.filter((documento) => documento.obrigatorio);
  if (obrigatorios.length === 0) return false;

  return obrigatorios.every(
    (documento) => documento.dispensadoPorId != null || documento.status === 'APROVADO',
  );
};

const getEnvelopeStats = (envelopes: EnvelopeAssinatura[]) => {
  const total = envelopes.reduce((sum, envelope) => sum + envelope.documentos.length, 0);
  const signed = envelopes.reduce(
    (sum, envelope) => sum + envelope.documentos.filter((documento) => documento.status === 'ASSINADO').length,
    0,
  );
  const pending = total - signed;

  return { total, signed, pending };
};

const envelopeTitle = (envelope: EnvelopeAssinatura) =>
  envelope.setor === 'ADM_PESSOAL' ? 'Adm Pessoal' : 'SESMT';

export default function AssinaturasRhPage() {
  const [searchParams] = useSearchParams();
  const candidatoId = searchParams.get('candidatoId') ? Number(searchParams.get('candidatoId')) : null;
  const [documentos, setDocumentos] = useState<DocumentosCandidatura[]>([]);
  const [assinaturas, setAssinaturas] = useState<AssinaturasCandidatura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gerandoId, setGerandoId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    const [{ data: documentosData }, { data: assinaturasData }] = await Promise.all([
      api.get<DocumentosCandidatura[]>('/documentos/rh'),
      api.get<AssinaturasCandidatura[]>('/documentos/assinaturas/rh'),
    ]);

    setDocumentos(
      candidatoId ? documentosData.filter((item) => item.candidato.id === candidatoId) : documentosData,
    );
    setAssinaturas(
      candidatoId ? assinaturasData.filter((item) => item.candidato.id === candidatoId) : assinaturasData,
    );
  }, [candidatoId]);

  useEffect(() => {
    loadData()
      .catch(() => setError('Não foi possível carregar assinaturas.'))
      .finally(() => setIsLoading(false));
  }, [loadData]);

  const rows = useMemo(() => {
    return documentos
      .map((candidatura) => {
        const assinatura = assinaturas.find((item) => item.id === candidatura.id) ?? null;
        return {
          candidatura,
          assinatura,
          prontoParaGerar: documentosProntosParaAssinatura(candidatura),
        };
      })
      .filter((row) => row.assinatura || row.prontoParaGerar);
  }, [assinaturas, documentos]);

  const pendentes = rows.filter((row) => {
    if (!row.assinatura) return row.prontoParaGerar;
    return getEnvelopeStats(row.assinatura.envelopesAssinatura).pending > 0;
  }).length;
  const concluidas = rows.filter((row) => {
    if (!row.assinatura) return false;
    const stats = getEnvelopeStats(row.assinatura.envelopesAssinatura);
    return stats.total > 0 && stats.pending === 0;
  }).length;

  const gerarAssinaturas = async (candidaturaId: number) => {
    setError('');
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

  return (
    <>
      <PageHeader
        eyebrow="Assinaturas"
        title="Documentos para assinatura"
        description="Gere envelopes para candidatos prontos e acompanhe contratos pendentes de assinatura."
        actions={
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex">
            <span className="rounded-full border bg-card px-3 py-2 font-semibold text-muted-foreground">
              Pendentes · {pendentes}
            </span>
            <span className="rounded-full border bg-card px-3 py-2 font-semibold text-muted-foreground">
              Concluídas · {concluidas}
            </span>
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

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
            <p className="mt-1">Quando todos os documentos obrigatórios forem aprovados, o candidato aparecerá aqui.</p>
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
              onGerar={() => gerarAssinaturas(row.candidatura.id)}
            />
          ))}
        </section>
      )}
    </>
  );
}

function AssinaturaCandidaturaCard({
  candidatura,
  assinatura,
  isGerando,
  onGerar,
}: {
  candidatura: DocumentosCandidatura;
  assinatura: AssinaturasCandidatura | null;
  isGerando: boolean;
  onGerar: () => void;
}) {
  const envelopes = assinatura?.envelopesAssinatura ?? [];
  const stats = getEnvelopeStats(envelopes);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatCandidaturaTitle(candidatura)}</p>
        </div>

        {assinatura ? (
          <div className="rounded-xl border bg-background px-4 py-3 text-sm">
            <span className="font-semibold">{stats.signed}/{stats.total}</span>{' '}
            <span className="text-muted-foreground">documentos assinados</span>
          </div>
        ) : (
          <Button type="button" disabled={isGerando} onClick={onGerar}>
            {isGerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
            Gerar documentos
          </Button>
        )}
      </div>

      {assinatura && (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {envelopes.map((envelope) => (
            <EnvelopeCard key={envelope.id} envelope={envelope} />
          ))}
        </div>
      )}
    </article>
  );
}

function EnvelopeCard({ envelope }: { envelope: EnvelopeAssinatura }) {
  const signed = envelope.documentos.filter((documento) => documento.status === 'ASSINADO').length;

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{envelopeTitle(envelope)}</p>
          <p className="text-xs text-muted-foreground">
            {signed}/{envelope.documentos.length} assinados
          </p>
        </div>
        {envelope.status === 'CONCLUIDO' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Concluído
          </span>
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
                  <p className="text-xs text-muted-foreground">Verificação: {documento.codigoVerificacao}</p>
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
                <a href={getDocumentoAssinaturaRhUrl(documento.id)} download={`documento-assinatura-${documento.id}.pdf`}>
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
