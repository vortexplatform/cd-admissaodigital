import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { Button } from '@/components/ui/button';

export default function AdminLayout() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navigationOpen) return;
    drawerRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavigationOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [navigationOpen]);

  return (
    <div className="app-surface min-h-screen text-foreground">
      <AppHeader
        title="Admissão Digital"
        description="Painel operacional de admissões"
        showEmpresaSelector
        navigationOpen={navigationOpen}
        onOpenNavigation={() => setNavigationOpen((open) => !open)}
      />
      {navigationOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Fechar menu"
            onClick={() => setNavigationOpen(false)}
          />
          <div
            id="app-navigation-drawer"
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Navegação principal"
            className="relative h-full w-[min(19rem,calc(100vw-3rem))] border-r bg-card text-card-foreground outline-none"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <p className="text-body font-medium text-foreground">Menu</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setNavigationOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <AppSidebar
              className="block h-[calc(100%_-_4.5rem)] overflow-y-auto border-0 bg-card"
              onNavigate={() => setNavigationOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-[16rem_1fr]">
        <AppSidebar />
        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
