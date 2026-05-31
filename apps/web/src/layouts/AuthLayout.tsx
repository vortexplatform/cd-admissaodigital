import { Outlet } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function AuthLayout() {
  return (
    <div className="app-surface relative flex min-h-screen items-center justify-center p-4 pt-16">
      <ThemeToggle className="absolute right-4 top-4 shadow-corporate" />
      <Outlet />
    </div>
  );
}
