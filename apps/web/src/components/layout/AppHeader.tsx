import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmpresaSelector from '@/components/EmpresaSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

type AppHeaderProps = {
  title: string;
  description: string;
  showEmpresaSelector?: boolean;
  badgeLabel?: string;
};

export default function AppHeader({
  title,
  description,
  showEmpresaSelector = false,
  badgeLabel,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const identifier = user?.email ?? user?.telefone ?? '';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex flex-col gap-4 border-b bg-card/95 px-4 py-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {showEmpresaSelector ? (
          <EmpresaSelector />
        ) : (
          <div className="rounded-lg border bg-background px-3 py-2 text-sm">
            <p className="font-medium leading-none">{badgeLabel ?? 'Acesso'}</p>
            <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{identifier}</p>
          </div>
        )}
        <ThemeToggle />
        <Button type="button" variant="outline" onClick={handleLogout} className="justify-start">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
