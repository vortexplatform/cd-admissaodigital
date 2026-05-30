import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Edit3,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Empresa {
  id: number;
  nome: string;
  codigoEmpresaSenior: string;
}

const empresaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da empresa'),
  codigoEmpresaSenior: z.string().trim().min(1, 'Informe o código da empresa Senior'),
});

type EmpresaForm = z.infer<typeof empresaSchema>;

export default function EmpresasPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { nome: '', codigoEmpresaSenior: '' },
  });

  const loadEmpresas = async () => {
    const { data } = await api.get<Empresa[]>('/empresas');
    setEmpresas(data);
  };

  useEffect(() => {
    loadEmpresas()
      .catch(() => setError('Não foi possível carregar as empresas.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clearForm = () => {
    setEditingEmpresa(null);
    reset({ nome: '', codigoEmpresaSenior: '' });
  };

  const startEditing = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    reset({ nome: empresa.nome, codigoEmpresaSenior: empresa.codigoEmpresaSenior });
  };

  const onSubmit = async (values: EmpresaForm) => {
    setIsSaving(true);
    setError('');

    try {
      if (editingEmpresa) {
        await api.patch(`/empresas/${editingEmpresa.id}`, values);
      } else {
        await api.post('/empresas', values);
      }

      await loadEmpresas();
      clearForm();
    } catch {
      setError('Não foi possível salvar a empresa. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeEmpresa = async (empresa: Empresa) => {
    const confirmed = window.confirm(`Excluir a empresa "${empresa.nome}"?`);
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/empresas/${empresa.id}`);
      await loadEmpresas();
      if (editingEmpresa?.id === empresa.id) clearForm();
    } catch {
      setError('Não foi possível excluir a empresa.');
    }
  };

  const identifier = user?.email ?? user?.telefone ?? '';

  return (
    <div className="app-surface min-h-screen text-foreground">
      <header className="flex flex-col gap-4 border-b bg-card/95 px-4 py-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none">Empresas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastro administrativo integrado ao Senior
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-lg border bg-background px-3 py-2 text-sm">
            <p className="font-medium leading-none">Administrador</p>
            <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
              {identifier}
            </p>
          </div>
          <ThemeToggle />
          <Button type="button" variant="outline" onClick={handleLogout} className="justify-start">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[16rem_1fr]">
        <aside className="hidden border-r bg-card/70 p-5 lg:block">
          <nav className="space-y-5 text-sm">
            <div>
              <div className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Processos</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Visão geral
              </button>
              {['Candidatos', 'Pendências'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (item === 'Candidatos') navigate('/candidatos');
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {item}
                </button>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Configurações</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={() => navigate('/requisicoes')}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <BriefcaseBusiness className="h-4 w-4" />
                Requisições
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-left text-primary-foreground"
              >
                <Building2 className="h-4 w-4" />
                Empresa
              </button>
            </div>
          </nav>
        </aside>

        <main className="px-4 py-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Administração
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
                Cadastro de empresas
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Cadastre, edite e remova empresas usadas nos fluxos de admissão e integração Senior.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </section>

          <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle>{editingEmpresa ? 'Editar empresa' : 'Nova empresa'}</CardTitle>
                <CardDescription>
                  Informe o nome e o código correspondente no Senior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" placeholder="Ex.: Coelho Diniz Matriz" {...register('nome')} />
                    {errors.nome && (
                      <p className="text-sm text-destructive">{errors.nome.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigoEmpresaSenior">Código empresa Senior</Label>
                    <Input
                      id="codigoEmpresaSenior"
                      placeholder="Ex.: 001"
                      {...register('codigoEmpresaSenior')}
                    />
                    {errors.codigoEmpresaSenior && (
                      <p className="text-sm text-destructive">
                        {errors.codigoEmpresaSenior.message}
                      </p>
                    )}
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={isSaving} className="w-full">
                      {editingEmpresa ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {isSaving
                        ? 'Salvando...'
                        : editingEmpresa
                          ? 'Salvar alterações'
                          : 'Cadastrar'}
                    </Button>
                    {editingEmpresa && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearForm}
                        className="w-full"
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle>Empresas cadastradas</CardTitle>
                <CardDescription>{empresas.length} empresa(s) disponível(is).</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando empresas...</p>
                ) : empresas.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-background p-8 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 font-semibold">Nenhuma empresa cadastrada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use o formulário ao lado para criar o primeiro registro.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="hidden grid-cols-[1fr_12rem_11rem] gap-4 border-b bg-muted/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                      <span>Empresa</span>
                      <span>Código Senior</span>
                      <span className="text-right">Ações</span>
                    </div>
                    <div className="divide-y">
                      {empresas.map((empresa) => (
                        <div
                          key={empresa.id}
                          className="grid gap-3 bg-background px-4 py-4 md:grid-cols-[1fr_12rem_11rem] md:items-center"
                        >
                          <div>
                            <p className="font-semibold">{empresa.nome}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              Senior: {empresa.codigoEmpresaSenior}
                            </p>
                          </div>
                          <span className="hidden rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground md:inline-flex md:w-fit">
                            {empresa.codigoEmpresaSenior}
                          </span>
                          <div className="flex gap-2 md:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(empresa)}
                            >
                              <Edit3 className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeEmpresa(empresa)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
