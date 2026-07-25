import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCopy, MonitorSmartphone, Plus, Wifi, WifiOff } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

interface Dispositivo {
  id: number;
  nome: string;
  ativo: boolean;
  ultimoPingEm: string | null;
  createdAt: string;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

const isOnline = (ultimoPingEm: string | null) => {
  if (!ultimoPingEm) return false;
  return Date.now() - new Date(ultimoPingEm).getTime() < 2 * 60 * 1000;
};

export default function BiometriaPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [tokenGerado, setTokenGerado] = useState<{ nome: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  const loadDispositivos = useCallback(async () => {
    const { data } = await api.get<Dispositivo[]>('/biometria/dispositivos');
    setDispositivos(data);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadDispositivos()
      .catch(() => setError('Não foi possível carregar os dispositivos.'))
      .finally(() => setIsLoading(false));
  }, [loadDispositivos]);

  const criar = async () => {
    if (!nome.trim()) {
      setError('Informe um nome para o dispositivo.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const { data } = await api.post<{ dispositivo: Dispositivo; token: string }>('/biometria/dispositivos', { nome: nome.trim() });
      setTokenGerado({ nome: data.dispositivo.nome, token: data.token });
      setNome('');
      await loadDispositivos();
    } catch {
      setError('Não foi possível criar o dispositivo. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const copiar = async () => {
    if (!tokenGerado) return;
    await navigator.clipboard.writeText(tokenGerado.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Dispositivos biométricos"
        description="Gerencie os tablets e dispositivos usados para captura e verificação biométrica dos candidatos."
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_26rem]">
        <Card className="">
          <CardHeader>
            <CardTitle>Dispositivos cadastrados</CardTitle>
            <CardDescription>
              Dispositivos ativos são autorizados a receber e processar solicitações biométricas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando dispositivos...</p>
            ) : dispositivos.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-background p-8 text-center">
                <MonitorSmartphone className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Nenhum dispositivo cadastrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre o primeiro dispositivo biométrico para começar.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {dispositivos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MonitorSmartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium leading-tight">{d.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Criado em {formatDate(d.createdAt)}
                          {d.ultimoPingEm && ` · último ping ${formatDate(d.ultimoPingEm)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.ativo ? (
                        isOnline(d.ultimoPingEm) ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            <Wifi className="h-3 w-3" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            <WifiOff className="h-3 w-3" />
                            Offline
                          </span>
                        )
                      ) : (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                          Inativo
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="">
            <CardHeader>
              <CardTitle>Novo dispositivo</CardTitle>
              <CardDescription>
                O token gerado é exibido uma única vez. Guarde-o com segurança.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do dispositivo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && criar()}
                  placeholder="Ex: Tablet Recepção"
                  disabled={isSaving}
                />
              </div>
              <Button onClick={criar} disabled={isSaving || !nome.trim()} className="w-full">
                <Plus className="h-4 w-4" />
                {isSaving ? 'Criando dispositivo...' : 'Criar dispositivo'}
              </Button>
            </CardContent>
          </Card>

          {tokenGerado && (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  <CardTitle className="text-emerald-900 dark:text-emerald-300">
                    Dispositivo criado
                  </CardTitle>
                </div>
                <CardDescription className="text-emerald-800 dark:text-emerald-400">
                  Copie o token abaixo e configure o dispositivo <strong>{tokenGerado.nome}</strong>. Ele não será exibido novamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  ref={tokenRef}
                  readOnly
                  value={tokenGerado.token}
                  className="font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  onClick={copiar}
                  className="w-full border-emerald-300 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  {copied ? 'Copiado!' : 'Copiar token'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
