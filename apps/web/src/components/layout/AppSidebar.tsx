import {
  BriefcaseBusiness,
  Building2,
  FileText,
  LayoutDashboard,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

export default function AppSidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="hidden border-r bg-card/70 p-5 lg:block">
      <nav className="space-y-5 text-sm">
        <div>
          <div className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Processos</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <NavLink to="/" end className={linkClass}>
            <LayoutDashboard className="h-4 w-4" />
            Visão geral
          </NavLink>
          <NavLink to="/requisicoes" className={linkClass}>
            <BriefcaseBusiness className="h-4 w-4" />
            Requisições
          </NavLink>
          <NavLink to="/candidatos" className={linkClass}>
            <UserRound className="h-4 w-4" />
            Candidatos
          </NavLink>
          <button
            type="button"
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Pendências
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Configurações</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <NavLink to="/documentos/configuracoes" className={linkClass}>
            <FileText className="h-4 w-4" />
            Regras de documentos
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/empresas" className={linkClass}>
                <Building2 className="h-4 w-4" />
                Empresas
              </NavLink>
              <NavLink to="/usuarios" className={linkClass}>
                <UsersRound className="h-4 w-4" />
                Usuários
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </aside>
  );
}
