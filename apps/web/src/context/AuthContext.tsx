import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '@/lib/api';

export interface User {
  id: number;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  nome: string | null;
  role: 'CANDIDATO' | 'RH' | 'ADMIN';
  createdAt: string;
}

export interface Empresa {
  id: number;
  nome: string;
  codigoEmpresaSenior: string;
}

export interface AuthSession {
  user: User;
  empresas: Empresa[];
  empresaAtiva: Empresa | null;
}

interface AuthContextType {
  user: User | null;
  empresas: Empresa[];
  empresaAtiva: Empresa | null;
  isLoading: boolean;
  login: (session: AuthSession) => void;
  updateUser: (user: User) => void;
  selectEmpresa: (empresaId: number) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const EMPRESA_ATIVA_COOKIE = 'empresa_ativa_id';

const readCookie = (name: string) => {
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')[1];

  return value ? decodeURIComponent(value) : null;
};

const writeEmpresaCookie = (empresaId: number | null) => {
  if (!empresaId) {
    document.cookie = `${EMPRESA_ATIVA_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${EMPRESA_ATIVA_COOKIE}=${empresaId}; path=/; max-age=31536000; SameSite=Lax`;
};

const resolveEmpresaAtiva = (empresas: Empresa[], fallback: Empresa | null) => {
  const cookieEmpresaId = Number(readCookie(EMPRESA_ATIVA_COOKIE));
  const cookieEmpresa = empresas.find((empresa) => empresa.id === cookieEmpresaId);

  return cookieEmpresa ?? fallback ?? empresas[0] ?? null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaAtiva, setEmpresaAtiva] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuthSession>('/auth/me')
      .then((res) => {
        const activeEmpresa = resolveEmpresaAtiva(res.data.empresas, res.data.empresaAtiva);

        setUser(res.data.user);
        setEmpresas(res.data.empresas);
        setEmpresaAtiva(activeEmpresa);
        writeEmpresaCookie(activeEmpresa?.id ?? null);
      })
      .catch(() => {
        writeEmpresaCookie(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (session: AuthSession) => {
    const activeEmpresa = resolveEmpresaAtiva(session.empresas, session.empresaAtiva);

    setUser(session.user);
    setEmpresas(session.empresas);
    setEmpresaAtiva(activeEmpresa);
    writeEmpresaCookie(activeEmpresa?.id ?? null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const selectEmpresa = (empresaId: number) => {
    const empresa = empresas.find((item) => item.id === empresaId);
    if (!empresa) return;

    setEmpresaAtiva(empresa);
    writeEmpresaCookie(empresa.id);
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    writeEmpresaCookie(null);
    setUser(null);
    setEmpresas([]);
    setEmpresaAtiva(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, empresas, empresaAtiva, isLoading, login, updateUser, selectEmpresa, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
