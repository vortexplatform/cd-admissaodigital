import {
  BriefcaseBusiness,
  Building2,
  BarChart3,
  ClipboardCheck,
  FileSignature,
  FileText,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-body-sm transition ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
  }`;

type AppSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className={cn('hidden border-r bg-background p-5 lg:block', className)}>
      <nav className="space-y-5 text-body-sm">
        <div>
          <div className="mb-2 flex items-center gap-3 px-3 text-caption font-medium text-muted-foreground">
            <span>Processos</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <NavLink to="/painel" end className={linkClass} onClick={onNavigate}>
            <LayoutDashboard className="h-4 w-4" />
            Visão geral
          </NavLink>
          <NavLink to="/requisicoes" className={linkClass} onClick={onNavigate}>
            <BriefcaseBusiness className="h-4 w-4" />
            Requisições
          </NavLink>
          <NavLink to="/candidatos" className={linkClass} onClick={onNavigate}>
            <UserRound className="h-4 w-4" />
            Candidatos
          </NavLink>
          <NavLink to="/documentos" className={linkClass} onClick={onNavigate}>
            <ClipboardCheck className="h-4 w-4" />
            Entrega de documentos
          </NavLink>
          <NavLink to="/assinaturas" className={linkClass} onClick={onNavigate}>
            <FileSignature className="h-4 w-4" />
            Assinaturas
          </NavLink>
        </div>

        <div>
          <NavLink to="/relatorios" end className={linkClass} onClick={onNavigate}>
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </NavLink>
        </div>

        {isAdmin && (
          <div>
            <div className="mb-2 flex items-center gap-3 px-3 text-caption font-medium text-muted-foreground">
              <span>Configurações</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <NavLink to="/documentos/configuracoes" className={linkClass} onClick={onNavigate}>
              <FileText className="h-4 w-4" />
              Regras de documentos
            </NavLink>
            <NavLink to="/certificados-a1" className={linkClass} onClick={onNavigate}>
              <KeyRound className="h-4 w-4" />
              Certificado A1
            </NavLink>
            <NavLink to="/biometria" className={linkClass} onClick={onNavigate}>
              <Fingerprint className="h-4 w-4" />
              Biometria
            </NavLink>
            <NavLink to="/empresas" className={linkClass} onClick={onNavigate}>
              <Building2 className="h-4 w-4" />
              Empresas
            </NavLink>
            <NavLink to="/usuarios" className={linkClass} onClick={onNavigate}>
              <UsersRound className="h-4 w-4" />
              Usuários
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  );
}
