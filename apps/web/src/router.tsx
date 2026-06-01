import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import OtpPage from '@/pages/OtpPage';
import HomePage from '@/pages/HomePage';
import CompleteProfilePage from '@/pages/CompleteProfilePage';
import EmpresasPage from '@/pages/EmpresasPage';
import RequisicoesPage from '@/pages/RequisicoesPage';
import RequisicaoFormPage from '@/pages/RequisicaoFormPage';
import CandidatosPage from '@/pages/CandidatosPage';
import CandidatoFormPage from '@/pages/CandidatoFormPage';
import DocumentosRhPage from '@/pages/DocumentosRhPage';
import DocumentoTemplatesPage from '@/pages/DocumentoTemplatesPage';
import CandidateDocumentosPage from '@/pages/CandidateDocumentosPage';
import CompanyAccessRequiredPage from '@/pages/CompanyAccessRequiredPage';
import UsuariosPage from '@/pages/UsuariosPage';
import SignupPage from '@/pages/SignupPage';
import AdminLayout from '@/layouts/AdminLayout';
import CandidateLayout from '@/layouts/CandidateLayout';
import AuthLayout from '@/layouts/AuthLayout';

function hasCompleteProfile(user: ReturnType<typeof useAuth>['user']) {
  return Boolean(user?.nome?.trim() && user?.cpf?.trim());
}

function needsCompanyLink(user: ReturnType<typeof useAuth>['user'], empresasCount: number) {
  return Boolean(user && ['RH', 'ADMIN'].includes(user.role) && empresasCount === 0);
}

function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, empresas, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  if (needsCompanyLink(user, empresas.length))
    return <Navigate to="/empresa-obrigatoria" replace />;
  return children ? <>{children}</> : <Outlet />;
}

function AdminRoute({ children }: { children?: React.ReactNode }) {
  const { user, empresas, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  if (needsCompanyLink(user, empresas.length))
    return <Navigate to="/empresa-obrigatoria" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children ? <>{children}</> : <Outlet />;
}

function AdminLayoutRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role === 'CANDIDATO') return <Navigate to="/candidato" replace />;

  return (
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  );
}

function CandidateLayoutRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user?.role !== 'CANDIDATO') return <Navigate to="/" replace />;
  return (
    <ProtectedRoute>
      <CandidateLayout />
    </ProtectedRoute>
  );
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
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
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
      </Route>
      <Route path="/empresa-obrigatoria" element={<CompanyRequiredRoute />} />
      <Route element={<AdminLayoutRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/requisicoes" element={<RequisicoesPage />} />
        <Route path="/requisicoes/novo" element={<RequisicaoFormPage mode="create" />} />
        <Route path="/requisicoes/:id" element={<RequisicaoFormPage mode="view" />} />
        <Route path="/requisicoes/:id/editar" element={<RequisicaoFormPage mode="edit" />} />
        <Route path="/candidatos" element={<CandidatosPage />} />
        <Route path="/candidatos/novo" element={<CandidatoFormPage mode="create" />} />
        <Route path="/candidatos/:id" element={<CandidatoFormPage mode="view" />} />
        <Route path="/candidatos/:id/editar" element={<CandidatoFormPage mode="edit" />} />
        <Route path="/candidatos/:id/documentos" element={<DocumentosRhPage />} />
        <Route path="/documentos" element={<DocumentosRhPage />} />
        <Route path="/documentos/configuracoes" element={<DocumentoTemplatesPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/empresas" element={<EmpresasPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
        </Route>
      </Route>
      <Route element={<CandidateLayoutRoute />}>
        <Route path="/candidato" element={<HomePage />} />
        <Route path="/candidato/documentos" element={<CandidateDocumentosPage />} />
        <Route path="/candidato/assinaturas" element={<HomePage />} />
        <Route path="/candidato/status" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
