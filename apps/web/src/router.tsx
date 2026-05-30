import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import OtpPage from '@/pages/OtpPage';
import HomePage from '@/pages/HomePage';
import CompleteProfilePage from '@/pages/CompleteProfilePage';
import EmpresasPage from '@/pages/EmpresasPage';
import RequisicoesPage from '@/pages/RequisicoesPage';
import CandidatosPage from '@/pages/CandidatosPage';
import CandidatoFormPage from '@/pages/CandidatoFormPage';
import CompanyAccessRequiredPage from '@/pages/CompanyAccessRequiredPage';

function hasCompleteProfile(user: ReturnType<typeof useAuth>['user']) {
  return Boolean(user?.nome?.trim() && user?.cpf?.trim());
}

function needsCompanyLink(user: ReturnType<typeof useAuth>['user'], empresasCount: number) {
  return Boolean(user && ['RH', 'ADMIN'].includes(user.role) && empresasCount === 0);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, empresas, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  if (needsCompanyLink(user, empresas.length)) return <Navigate to="/empresa-obrigatoria" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, empresas, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  if (needsCompanyLink(user, empresas.length)) return <Navigate to="/empresa-obrigatoria" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CompanyRequiredRoute() {
  const { user, empresas, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  if (!needsCompanyLink(user, empresas.length)) return <Navigate to="/" replace />;
  return <CompanyAccessRequiredPage />;
}

function CompleteProfileRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (hasCompleteProfile(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user && !hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function Router() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <PublicRoute>
            <OtpPage />
          </PublicRoute>
        }
      />
      <Route
        path="/complete-profile"
        element={
          <CompleteProfileRoute>
            <CompleteProfilePage />
          </CompleteProfileRoute>
        }
      />
      <Route path="/empresa-obrigatoria" element={<CompanyRequiredRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requisicoes"
        element={
          <ProtectedRoute>
            <RequisicoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidatos"
        element={
          <ProtectedRoute>
            <CandidatosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidatos/novo"
        element={
          <ProtectedRoute>
            <CandidatoFormPage mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidatos/:id"
        element={
          <ProtectedRoute>
            <CandidatoFormPage mode="view" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidatos/:id/editar"
        element={
          <ProtectedRoute>
            <CandidatoFormPage mode="edit" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresas"
        element={
          <AdminRoute>
            <EmpresasPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
