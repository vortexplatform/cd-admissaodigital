import { Outlet } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';

export default function AdminLayout() {
  return (
    <div className="app-surface min-h-screen text-foreground">
      <AppHeader
        title="Admissão Digital"
        description="Painel operacional de admissões"
        showEmpresaSelector
      />
      <div className="grid lg:grid-cols-[16rem_1fr]">
        <AppSidebar />
        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
