import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import OtpPage from '@/pages/OtpPage';
import HomePage from '@/pages/HomePage';
import CompleteProfilePage from '@/pages/CompleteProfilePage';

function hasCompleteProfile(user: ReturnType<typeof useAuth>['user']) {
  return Boolean(user?.nome?.trim() && user?.cpf?.trim());
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompleteProfile(user)) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
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
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
