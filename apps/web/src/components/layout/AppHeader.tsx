import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmpresaSelector from '@/components/EmpresaSelector';
import BiometriaSelector from '@/components/BiometriaSelector';
import { Logo } from '@/components/Logo';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const envBadge = showEmpresaSelector ? (
    <>
      <BiometriaSelector />
      <EmpresaSelector />
    </>
  ) : (
    <div className="rounded-md border bg-card px-3 py-2 text-body-sm">
      <p className="font-medium leading-none">{badgeLabel ?? 'Acesso'}</p>
      <p className="mt-1 max-w-[220px] truncate text-caption text-muted-foreground">
        {identifier}
      </p>
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

        {/* Hambúrguer — apenas mobile */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Painel mobile */}
      {mobileMenuOpen && (
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
