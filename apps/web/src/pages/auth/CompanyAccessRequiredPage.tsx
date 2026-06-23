import { Building2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';

export default function CompanyAccessRequiredPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-surface relative flex min-h-screen items-center justify-center p-4 pt-16 text-foreground">
      <ThemeToggle className="absolute right-4 top-4 shadow-corporate" />
      <Card className="w-full max-w-lg shadow-corporate">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="font-display text-2xl">Empresa não vinculada</CardTitle>
          <CardDescription>
            Seu usuário {user?.role === 'ADMIN' ? 'administrador' : 'de RH'} precisa estar vinculado
            a uma empresa para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Peça para um administrador vincular seu usuário a pelo menos uma empresa e entre
            novamente.
          </p>
          <Button type="button" variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
