import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, UploadCloud } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface CertificadoA1 {
  id: number;
  empresaId: number;
  nomeArquivo: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validoDe: string;
  validoAte: string;
  thumbprint: string;
  ativo: boolean;
  createdAt: string;
  updatedAt?: string;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );

const isExpired = (value: string) => new Date(value).getTime() <= Date.now();

export default function CertificadosA1Page() {
  const { empresas, empresaAtiva, selectEmpresa } = useAuth();
  const [empresaId, setEmpresaId] = useState<number | null>(empresaAtiva?.id ?? empresas[0]?.id ?? null);
  const [certificados, setCertificados] = useState<CertificadoA1[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCertificados = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await api.get<CertificadoA1[]>(`/empresas/${empresaId}/certificados-a1`);
    setCertificados(data);
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId && empresaAtiva) setEmpresaId(empresaAtiva.id);
  }, [empresaAtiva, empresaId]);

  useEffect(() => {
    if (!empresaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    loadCertificados()
      .catch(() => setError('Não foi possível carregar os certificados da empresa.'))
      .finally(() => setIsLoading(false));
  }, [empresaId, loadCertificados]);

  const handleEmpresaChange = (value: string) => {
    const nextEmpresaId = Number(value);
    setEmpresaId(nextEmpresaId);
    selectEmpresa(nextEmpresaId);
    setFile(null);
    setSenha('');
    setSuccess('');
  };

  const upload = async () => {
    if (!empresaId) return;
    if (!file || !senha.trim()) {
      setError('Selecione o arquivo do certificado e informe a senha.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('senha', senha);

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/empresas/${empresaId}/certificados-a1`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadCertificados();
      setFile(null);
      setSenha('');
      setSuccess('Certificado A1 salvo e definido como ativo para esta empresa.');
    } catch {
      setError('Não foi possível salvar o certificado. Verifique o arquivo e a senha.');
    } finally {
      setIsSaving(false);
    }
  };

  const ativo = certificados.find((certificado) => certificado.ativo);

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Certificado A1 da empresa"
        description="Cadastre o certificado digital usado para assinar os PDFs após a assinatura eletrônica do candidato."
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_26rem]">
        <Card className="">
          <CardHeader>
            <CardTitle>Certificado ativo</CardTitle>
            <CardDescription>Somente o certificado ativo é usado nas assinaturas digitais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <select
                id="empresa"
                value={empresaId ?? ''}
                onChange={(event) => handleEmpresaChange(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm font-medium text-emerald-700">{success}</p>}

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando certificado...</p>
            ) : !ativo ? (
              <div className="rounded-2xl border border-dashed bg-background p-8 text-center">
                <KeyRound className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Nenhum certificado ativo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Envie um arquivo .pfx ou .p12 para liberar a certificação dos PDFs.
                </p>
              </div>
            ) : (
              <article className="rounded-2xl border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-700" />
                      <p className="font-semibold">{ativo.nomeArquivo}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{ativo.subject}</p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      isExpired(ativo.validoAte)
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isExpired(ativo.validoAte) ? 'Expirado' : 'Ativo'}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Válido de</dt>
                    <dd className="font-medium">{formatDate(ativo.validoDe)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Válido até</dt>
                    <dd className="font-medium">{formatDate(ativo.validoAte)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Serial</dt>
                    <dd className="break-all font-medium">{ativo.serialNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Thumbprint</dt>
                    <dd className="break-all font-medium">{ativo.thumbprint}</dd>
                  </div>
                </dl>
              </article>
            )}

            {certificados.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Histórico</p>
                {certificados
                  .filter((certificado) => !certificado.ativo)
                  .map((certificado) => (
                    <div key={certificado.id} className="rounded-xl border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">{certificado.nomeArquivo}</p>
                      <p className="text-muted-foreground">
                        Enviado em {formatDate(certificado.createdAt)} · válido até{' '}
                        {formatDate(certificado.validoAte)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle>{ativo ? 'Substituir certificado' : 'Enviar certificado'}</CardTitle>
            <CardDescription>
              O arquivo e a senha são criptografados no backend antes de salvar no banco.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificado">Arquivo .pfx ou .p12</Label>
              <Input
                id="certificado"
                type="file"
                accept=".pfx,.p12"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Tamanho máximo: 2MB.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha do certificado</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Informe a senha do A1"
              />
            </div>

            <Button type="button" onClick={upload} disabled={isSaving || !empresaId} className="w-full">
              <UploadCloud className="h-4 w-4" />
              {isSaving ? 'Validando certificado...' : ativo ? 'Substituir certificado' : 'Salvar certificado'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
