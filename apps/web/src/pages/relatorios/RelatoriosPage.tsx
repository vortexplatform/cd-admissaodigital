import { ArrowRight, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Relatórios"
        title="Relatórios"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/relatorios/candidatos-admitidos" aria-label="Abrir relatório de candidatos admitidos">
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/20">
            <CardContent className="flex min-h-24 items-center gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <UsersRound className="h-5 w-5" />
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <h2 className="text-body font-medium">Candidatos admitidos</h2>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </>
  );
}
