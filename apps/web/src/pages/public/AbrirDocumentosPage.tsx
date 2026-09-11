import { Check, Copy, FileText } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const accessTargets = {
  candidato: (token: string) => `/candidato/documentos/${token}`,
  responsavel: (token: string) => `/responsavel/assinaturas/${token}`,
} as const;

export default function AbrirDocumentosPage() {
  const { tipo, token } = useParams<{ tipo: string; token: string }>();
  const [copied, setCopied] = useState(false);
  const target =
    token && tipo && tipo in accessTargets
      ? accessTargets[tipo as keyof typeof accessTargets](token)
      : null;
  const platform = /iPad|iPhone|iPod/.test(navigator.userAgent)
    ? 'iPhone ou iPad'
    : /Android/.test(navigator.userAgent)
      ? 'Android'
      : 'celular';

  const copyLink = async () => {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(new URL(target, window.location.origin).href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (!target) {
    return (
      <main className="app-surface flex min-h-screen items-center justify-center p-5">
        <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-headline text-foreground">Link inválido</h1>
          <p className="mt-3 text-body text-muted-foreground">
            Este link de acesso não é válido ou está incompleto.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-surface flex min-h-screen items-center justify-center p-5">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-headline text-foreground">Acesse seus documentos</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Para continuar, copie o link abaixo e cole-o na barra de endereço do navegador do seu{' '}
          {platform}.
        </p>
        <Button asChild size="lg" className="mt-7 w-full">
          <a href={target}>Já estou no navegador</a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-3 w-full"
          onClick={copyLink}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Link copiado' : 'Copiar link'}
        </Button>
        <div className="mt-6 rounded-lg bg-secondary p-4 text-left text-body-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Como continuar no celular</p>
          <p className="mt-2">
            Toque em <strong className="font-semibold text-foreground">“Copiar link”</strong> e
            cole o endereço no Chrome ou Safari. Se você já estiver no navegador, cole o link na
            barra de endereço ou abra uma nova aba para continuar.
          </p>
        </div>
      </section>
    </main>
  );
}
