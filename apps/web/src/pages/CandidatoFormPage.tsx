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
  Save,
  UserRound,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EmpresaSelector from '@/components/EmpresaSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const statusLabels: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ABERTA: 'Aberta',
  AGUARDANDO_CANDIDATO: 'Aguardando candidato',
  EM_ADMISSAO: 'Em admissão',
  AGUARDANDO_DOCUMENTOS: 'Aguardando documentos',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  AGUARDANDO_RH: 'Aguardando RH',
  PENDENTE_CORRECAO: 'Pendente correção',
  APROVADA: 'Aprovada',
  INTEGRANDO_SENIOR: 'Integrando Senior',
  INTEGRADA_SENIOR: 'Integrada Senior',
  CANCELADA: 'Cancelada',
  REPROVADA: 'Reprovada',
  ERRO_INTEGRACAO: 'Erro integração',
};

interface Empresa {
  id: number;
  nome: string;
}

interface RequisicaoResumo {
  id: number;
  status: string;
  empresa: Empresa | null;
  dataPrevistaAdmissao: string | null;
  createdAt: string;
}

interface Candidato {
  id: number;
  cpf: string;
  dataNascimento: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  requisicoes: RequisicaoResumo[];
}

const candidatoSchema = z.object({
  cpf: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, '').length === 11, 'Informe um CPF com 11 dígitos'),
  dataNascimento: z.string().trim().min(1, 'Informe a data de nascimento'),
  nome: z.string().trim().optional(),
  email: z.string().trim().email('Informe um e-mail válido').optional().or(z.literal('')),
  telefone: z.string().trim().optional(),
});

type CandidatoForm = z.infer<typeof candidatoSchema>;
type CandidatoMode = 'create' | 'edit' | 'view';

const defaultValues: CandidatoForm = {
  cpf: '',
  dataNascimento: '',
  nome: '',
  email: '',
  telefone: '',
};

const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : '');
const toText = (value: string | null | undefined) => value ?? '';
const optionalString = (value?: string) => value?.trim() || undefined;

const buildPayload = (values: CandidatoForm) => ({
  cpf: values.cpf.replace(/\D/g, ''),
  dataNascimento: values.dataNascimento,
  nome: optionalString(values.nome),
  email: optionalString(values.email),
  telefone: optionalString(values.telefone),
});

const getPageTitle = (mode: CandidatoMode) => {
  if (mode === 'create') return 'Novo candidato';
  if (mode === 'edit') return 'Editar candidato';
  return 'Visualizar candidato';
};

export default function CandidatoFormPage({ mode }: { mode: CandidatoMode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [isLoading, setIsLoading] = useState(mode !== 'create');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isViewMode = mode === 'view';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CandidatoForm>({ resolver: zodResolver(candidatoSchema), defaultValues });

  useEffect(() => {
    if (mode === 'create') return;

    api
      .get<Candidato>(`/candidatos/${id}`)
      .then(({ data }) => {
        setCandidato(data);
        reset({
          cpf: data.cpf,
          dataNascimento: toDateInputValue(data.dataNascimento),
          nome: toText(data.nome),
          email: toText(data.email),
          telefone: toText(data.telefone),
        });
      })
      .catch(() => setError('Não foi possível carregar o candidato.'))
      .finally(() => setIsLoading(false));
  }, [id, mode, reset]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const onSubmit = async (values: CandidatoForm) => {
    if (isViewMode) return;

    setIsSaving(true);
    setError('');

    try {
      if (mode === 'edit') {
        await api.patch(`/candidatos/${id}`, buildPayload(values));
      } else {
        await api.post('/candidatos', buildPayload(values));
      }

      navigate('/candidatos');
    } catch {
      setError('Não foi possível salvar o candidato. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-surface min-h-screen text-foreground">
      <header className="flex flex-col gap-4 border-b bg-card/95 px-4 py-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none">Candidatos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastro e acompanhamento de admissões
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <EmpresaSelector />
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
                onClick={() => navigate('/candidatos')}
                className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-left text-primary-foreground"
              >
                <UserRound className="h-4 w-4" />
                Candidatos
              </button>
              <button
                type="button"
                className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Pendências
              </button>
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
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => navigate('/empresas')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Building2 className="h-4 w-4" />
                  Empresa
                </button>
              )}
            </div>
          </nav>
        </aside>

        <main className="px-4 py-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Admissão digital
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
                {getPageTitle(mode)}
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {isViewMode
                  ? 'Consulte os dados do candidato e as requisições vinculadas.'
                  : 'Preencha os dados pessoais usados nas requisições de admissão.'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/candidatos')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </section>

          {isLoading ? (
            <Card className="shadow-corporate">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Carregando candidato...
              </CardContent>
            </Card>
          ) : (
            <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
              <Card className="shadow-corporate">
                <CardHeader>
                  <CardTitle>Dados pessoais</CardTitle>
                  <CardDescription>
                    {isViewMode
                      ? 'Informações cadastradas.'
                      : 'Campos principais do cadastro de candidato.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        disabled={isViewMode}
                        placeholder="Ex.: Ana C. Silva"
                        {...register('nome')}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          disabled={isViewMode}
                          placeholder="000.000.000-00"
                          {...register('cpf')}
                        />
                        {errors.cpf && (
                          <p className="text-sm text-destructive">{errors.cpf.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataNascimento">Nascimento</Label>
                        <Input
                          id="dataNascimento"
                          disabled={isViewMode}
                          type="date"
                          {...register('dataNascimento')}
                        />
                        {errors.dataNascimento && (
                          <p className="text-sm text-destructive">
                            {errors.dataNascimento.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          disabled={isViewMode}
                          type="email"
                          placeholder="ana@email.com"
                          {...register('email')}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          disabled={isViewMode}
                          placeholder="(33) 99999-9999"
                          {...register('telefone')}
                        />
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {!isViewMode && (
                        <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                          <Save className="h-4 w-4" />
                          {isSaving ? 'Salvando...' : 'Salvar candidato'}
                        </Button>
                      )}
                      {isViewMode && candidato && (
                        <Button
                          type="button"
                          onClick={() => navigate(`/candidatos/${candidato.id}/editar`)}
                          className="w-full sm:w-auto"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar candidato
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="shadow-corporate">
                <CardHeader>
                  <CardTitle>Requisições vinculadas</CardTitle>
                  <CardDescription>
                    {candidato?.requisicoes.length ?? 0} vínculo(s) encontrado(s).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mode === 'create' || !candidato || candidato.requisicoes.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-background p-6 text-center">
                      <BriefcaseBusiness className="mx-auto h-7 w-7 text-muted-foreground" />
                      <p className="mt-2 font-semibold">Nenhuma requisição vinculada</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        O vínculo é feito no cadastro de requisições.
                      </p>
                    </div>
                  ) : (
                    candidato.requisicoes.map((requisicao) => (
                      <div key={requisicao.id} className="rounded-xl border bg-background p-4">
                        <p className="font-semibold">
                          {requisicao.empresa?.nome ?? 'Empresa não vinculada'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Etapa: {statusLabels[requisicao.status] ?? requisicao.status}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Admissão prevista:{' '}
                          {toDateInputValue(requisicao.dataPrevistaAdmissao) || '-'}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
