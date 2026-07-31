import { Outlet } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';

export default function CandidateLayout() {
  return (
    <div className="app-surface min-h-screen text-foreground">
      <AppHeader
        title="Admissão Digital"
        description="Acompanhamento da sua admissão"
        badgeLabel="Ambiente Candidato"
      />
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
