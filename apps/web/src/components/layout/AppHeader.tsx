import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmpresaSelector from '@/components/EmpresaSelector';
import { Logo } from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

type AppHeaderProps = {
  title: string;
  description: string;
  showEmpresaSelector?: boolean;
  badgeLabel?: string;
  navigationOpen?: boolean;
  onOpenNavigation?: () => void;
};

export default function AppHeader({
  title,
  description,
  showEmpresaSelector = false,
  badgeLabel,
  navigationOpen = false,
  onOpenNavigation,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const identifier = user?.email ?? user?.telefone ?? '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isNavigationMenu = Boolean(onOpenNavigation);
  const menuOpen = isNavigationMenu ? navigationOpen : mobileMenuOpen;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const envBadge = showEmpresaSelector ? (
    <>
      {/* Seletor de iDFace oculto temporariamente. */}
      <EmpresaSelector />
    </>
  ) : (
    <div className="rounded-md border bg-card px-3 py-2 text-body-sm">
      <p className="font-medium leading-none">{badgeLabel ?? 'Acesso'}</p>
      <p className="mt-1 max-w-[220px] truncate text-caption text-muted-foreground">{identifier}</p>
    </div>
  );

  return (
    <header className="border-b bg-background/95 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} />
          <div>
            <p className="text-body-lg font-medium leading-none">{title}</p>
            <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Controles — visíveis a partir de sm */}
        <div className="hidden sm:flex sm:items-center sm:gap-3">
          {envBadge}
          <ThemeToggle />
          <Button type="button" variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Navegação compacta para celular e tablet. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenNavigation ?? (() => setMobileMenuOpen((value) => !value))}
          aria-controls={isNavigationMenu ? 'app-navigation-drawer' : undefined}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Painel mobile */}
      {!isNavigationMenu && mobileMenuOpen && (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:hidden">
          {envBadge}
          <div className="flex gap-2">
            <ThemeToggle className="flex-1 justify-center" />
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="flex-1 justify-center"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
