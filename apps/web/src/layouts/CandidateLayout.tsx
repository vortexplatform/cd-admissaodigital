import { NavLink, Outlet } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
    isActive ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
  }`;

export default function CandidateLayout() {
  return (
    <div className="app-surface min-h-screen text-foreground">
      <AppHeader
        title="Admissão Digital"
        description="Acompanhamento da sua admissão"
        badgeLabel="Ambiente Candidato"
      />
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-2">
          <NavLink to="/candidato" end className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/candidato/documentos" className={linkClass}>
            Documentos
          </NavLink>
          <NavLink to="/candidato/assinaturas" className={linkClass}>
            Assinaturas
          </NavLink>
          <NavLink to="/candidato/status" className={linkClass}>
            Status
          </NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
