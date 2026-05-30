import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  LayoutDashboard,
  LogOut,
  Settings2,
  ScanLine,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmpresaSelector from '@/components/EmpresaSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth, type User } from '@/context/AuthContext';

type HomeProps = {
  user: User;
  identifier: string;
  onLogout: () => void;
};

const rhMetrics = [
  { label: 'Vagas abertas', value: '18', detail: '+4 na semana', icon: BriefcaseBusiness },
  { label: 'Em admissão', value: '42', detail: '9 aguardam RH', icon: UsersRound },
  { label: 'Documentos pendentes', value: '11', detail: '3 críticos', icon: ClipboardCheck },
  { label: 'Integrações Senior', value: '96%', detail: 'últimas 24h', icon: ScanLine },
];

const rhQueue = [
  {
    title: 'Analista Fiscal Jr.',
    company: 'Filial 03',
    status: 'Aguardando documentos',
    priority: 'Alta',
  },
  {
    title: 'Auxiliar de Logística',
    company: 'Matriz',
    status: 'Assinatura enviada',
    priority: 'Média',
  },
  { title: 'Coordenador de Loja', company: 'Filial 12', status: 'Revisão RH', priority: 'Normal' },
];

const candidateSteps = [
  { label: 'Perfil', description: 'Dados pessoais confirmados', done: true, icon: UserRoundCheck },
  {
    label: 'Documentos',
    description: 'Envio de arquivos obrigatórios',
    done: false,
    active: true,
    icon: ClipboardCheck,
  },
  { label: 'Assinatura', description: 'Contratos e declarações', done: false, icon: FileSignature },
  { label: 'Revisão RH', description: 'Validação final da equipe', done: false, icon: BadgeCheck },
  {
    label: 'Integração',
    description: 'Preparação para o primeiro dia',
    done: false,
    icon: Building2,
  },
];

function getDisplayName(user: User) {
  return user.nome?.trim().split(' ')[0] || 'Usuário';
}

function AppHeader({
  user,
  identifier,
  title,
  description,
  onLogout,
}: HomeProps & { title: string; description: string }) {
  const isRhEnvironment = ['RH', 'ADMIN'].includes(user.role);

  return (
    <header className="flex flex-col gap-4 border-b bg-card/95 px-4 py-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none">Admissão Digital</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {isRhEnvironment ? (
          <EmpresaSelector />
        ) : (
          <div className="rounded-lg border bg-background px-3 py-2 text-sm">
            <p className="font-medium leading-none">{title}</p>
            <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{identifier}</p>
          </div>
        )}
        <ThemeToggle />
        <Button type="button" variant="outline" onClick={onLogout} className="justify-start">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}

function RhHome({ user, identifier, onLogout }: HomeProps) {
  const navigate = useNavigate();
  const configItems = ['Requisições'];

  if (user.role === 'ADMIN') configItems.push('Empresa');

  return (
    <div className="app-surface min-h-screen text-foreground">
      <AppHeader
        user={user}
        identifier={identifier}
        onLogout={onLogout}
        title="Ambiente RH"
        description="Painel operacional de admissões"
      />

      <div className="grid lg:grid-cols-[16rem_1fr]">
        <aside className="hidden border-r bg-card/70 p-5 lg:block">
          <nav className="space-y-5 text-sm">
            <div>
              <div className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Processos</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {['Visão geral', 'Candidatos', 'Pendências'].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (item === 'Candidatos') navigate('/candidatos');
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                    index === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{item}</span>
                  {item === 'Candidatos' && (
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground">
                      7
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Configurações</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {configItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (item === 'Requisições') navigate('/requisicoes');
                    if (item === 'Empresa') navigate('/empresas');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    {item === 'Requisições' && <BriefcaseBusiness className="h-4 w-4" />}
                    {item === 'Empresa' && <Settings2 className="h-4 w-4" />}
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="px-4 py-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Resumo executivo
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
                Bom trabalho, {getDisplayName(user)}.
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Acompanhe requisições, pendências documentais e integrações em uma visão objetiva
                para tomada de decisão.
              </p>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => navigate('/requisicoes')}
            >
              Nova requisição
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rhMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="shadow-corporate">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <CardDescription>{metric.label}</CardDescription>
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="font-display text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{metric.detail}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle>Fila de atenção</CardTitle>
                <CardDescription>Processos que precisam de acompanhamento do RH.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rhQueue.map((item) => (
                  <div
                    key={item.title}
                    className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.company}</p>
                    </div>
                    <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                      {item.status}
                    </span>
                    <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle>Ações rápidas</CardTitle>
                <CardDescription>Atalhos para atividades recorrentes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {['Revisar documentos', 'Aprovar admissão', 'Sincronizar Senior'].map((action) => (
                  <button
                    key={action}
                    className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    {action}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

function CandidateHome({ user, identifier, onLogout }: HomeProps) {
  return (
    <div className="app-surface min-h-screen text-foreground">
      <AppHeader
        user={user}
        identifier={identifier}
        onLogout={onLogout}
        title="Ambiente Candidato"
        description="Acompanhamento da sua admissão"
      />

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Card className="shadow-corporate">
            <CardHeader className="pb-4">
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <LayoutDashboard className="h-4 w-4" />
                Etapa atual: documentos
              </div>
              <CardTitle className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
                {getDisplayName(user)}, continue sua admissão com segurança.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Organize os documentos necessários e acompanhe cada validação em um fluxo simples,
                transparente e com status sempre visível.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <Button type="button" className="h-11">
                Enviar documentos
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="rounded-xl border bg-background px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Canal de acesso
                </p>
                <p className="truncate text-sm font-medium">{identifier}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-corporate">
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
              <CardDescription>1 de 5 etapas concluída.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <p className="font-display text-4xl font-semibold">20%</p>
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/5 rounded-full bg-primary" />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="mt-4 shadow-corporate">
          <CardHeader>
            <CardTitle>Jornada da admissão</CardTitle>
            <CardDescription>Seu processo fica organizado por etapas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-5">
            {candidateSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className={`rounded-xl border p-4 ${step.active ? 'border-primary bg-primary/5' : 'bg-background'}`}
                >
                  <div
                    className={`mb-4 grid h-10 w-10 place-items-center rounded-lg ${
                      step.done
                        ? 'bg-primary text-primary-foreground'
                        : step.active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">{step.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const identifier = user?.email ?? user?.telefone ?? '';

  if (!user) return null;

  if (user.role === 'RH' || user.role === 'ADMIN') {
    return <RhHome user={user} identifier={identifier} onLogout={handleLogout} />;
  }

  return <CandidateHome user={user} identifier={identifier} onLogout={handleLogout} />;
}
