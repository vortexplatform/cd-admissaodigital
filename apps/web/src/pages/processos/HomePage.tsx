import { useEffect, useState } from 'react';
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
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, type User } from '@/context/AuthContext';
import api from '@/lib/api';
import type { AssinaturasCandidatura, DocumentosCandidatura } from './documentos.model';

type DashboardSummary = {
  vagasAbertas: number;
  aprovados: number;
  efetivados: number;
  admissoesNoMes: number;
};

const getDisplayName = (user: User) => user.nome?.trim().split(' ')[0] || 'Usuário';

const isDocumentoConcluido = (documento: DocumentosCandidatura['documentos'][number]) =>
  documento.dispensadoPorId != null || documento.status === 'APROVADO';

const getCandidateStatus = (documentos: DocumentosCandidatura[], assinaturas: AssinaturasCandidatura[]) => {
  const candidatura = documentos[0] ?? null;
  const assinatura = assinaturas.find((item) => item.id === candidatura?.id) ?? null;
  const docs = candidatura?.documentos ?? [];
  const requiredDocs = docs.filter((documento) => documento.obrigatorio && documento.dispensadoPorId == null);
  const documentosConcluidos = docs.length > 0 && docs.every(isDocumentoConcluido);
  const assinaturaDisponivel = documentosConcluidos && Boolean(assinatura?.envelopesAssinatura.length);
  const assinaturaConcluida = Boolean(
    assinatura?.envelopesAssinatura.length &&
      assinatura.envelopesAssinatura.every((envelope) => envelope.status === 'CONCLUIDO'),
  );

  return {
    documentosConcluidos,
    assinaturaDisponivel,
    assinaturaConcluida,
    documentosPendentes: requiredDocs.filter((documento) => !isDocumentoConcluido(documento)).length,
  };
};

function RhHome() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then((res) => setSummary(res.data))
      .catch(() => undefined);
  }, []);

  const metrics = [
    { label: 'Vagas abertas', value: summary?.vagasAbertas, detail: 'requisições ativas', icon: BriefcaseBusiness },
    { label: 'Aprovados (30 dias)', value: summary?.aprovados, detail: 'candidatos aprovados', icon: UserRoundCheck },
    { label: 'Efetivados (30 dias)', value: summary?.efetivados, detail: 'admissões concluídas', icon: BadgeCheck },
    { label: 'Admissões no mês', value: summary?.admissoesNoMes, detail: 'últimos 30 dias', icon: UsersRound },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Resumo executivo"
        title="Visão geral"
        actions={
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => navigate('/requisicoes')}
          >
            Nova requisição
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <CardDescription>{metric.label}</CardDescription>
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold tracking-tight">
                  {metric.value ?? '—'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{metric.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}

function CandidateHome({ user, identifier }: { user: User; identifier: string }) {
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState<DocumentosCandidatura[]>([]);
  const [assinaturas, setAssinaturas] = useState<AssinaturasCandidatura[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DocumentosCandidatura[]>('/documentos/candidato'),
      api.get<AssinaturasCandidatura[]>('/documentos/assinaturas/candidato'),
    ])
      .then(([documentosResponse, assinaturasResponse]) => {
        setDocumentos(documentosResponse.data);
        setAssinaturas(assinaturasResponse.data);
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const status = getCandidateStatus(documentos, assinaturas);
  const completedSteps = [
    true,
    status.documentosConcluidos,
    status.assinaturaConcluida,
    false,
    false,
  ].filter(Boolean).length;
  const progress = Math.max(20, completedSteps * 20);
  const currentLabel = status.assinaturaConcluida
    ? 'revisão RH'
    : status.documentosConcluidos
      ? 'assinatura'
      : 'documentos';
  const primaryRoute = status.documentosConcluidos ? '/candidato/assinaturas' : '/candidato/documentos';
  const primaryLabel = status.documentosConcluidos ? 'Assinar documentos' : 'Enviar documentos';
  const candidateSteps = [
    { label: 'Perfil', description: 'Dados pessoais confirmados', done: true, active: false, route: null, icon: UserRoundCheck },
    {
      label: 'Documentos',
      description: status.documentosConcluidos
        ? 'Arquivos obrigatórios aprovados'
        : status.documentosPendentes > 0
          ? `${status.documentosPendentes} pendente${status.documentosPendentes > 1 ? 's' : ''}`
          : 'Envio de arquivos obrigatórios',
      done: status.documentosConcluidos,
      active: !status.documentosConcluidos,
      route: '/candidato/documentos',
      icon: ClipboardCheck,
    },
    {
      label: 'Assinatura',
      description: status.assinaturaConcluida
        ? 'Contratos assinados'
        : status.assinaturaDisponivel
          ? 'Contratos prontos para assinatura'
          : 'Contratos e declarações',
      done: status.assinaturaConcluida,
      active: status.documentosConcluidos && !status.assinaturaConcluida,
      route: status.documentosConcluidos ? '/candidato/assinaturas' : null,
      icon: FileSignature,
    },
    { label: 'Revisão RH', description: 'Validação final da equipe', done: false, active: status.assinaturaConcluida, route: '/candidato/status', icon: BadgeCheck },
    {
      label: 'Integração',
      description: 'Preparação para o primeiro dia',
      done: false,
      active: false,
      route: null,
      icon: Building2,
    },
  ];

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="">
          <CardHeader className="pb-4">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <LayoutDashboard className="h-4 w-4" />
              Etapa atual: {isLoading ? 'carregando' : currentLabel}
            </div>
            <CardTitle className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
              {getDisplayName(user)}, continue sua admissão com segurança.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Organize documentos, assinaturas e validações em um fluxo simples, transparente e com status sempre visível.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <Button type="button" className="h-11" onClick={() => navigate(primaryRoute)} disabled={isLoading}>
              {primaryLabel}
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

        <Card className="">
          <CardHeader>
            <CardTitle>Progresso</CardTitle>
            <CardDescription>
              {completedSteps} de 5 etapas concluída{completedSteps === 1 ? '' : 's'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="font-display text-4xl font-semibold">{progress}%</p>
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
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
                onClick={() => step.route && navigate(step.route)}
                className={`rounded-xl border p-4 ${step.active ? 'border-primary bg-primary/5' : 'bg-background'} ${step.route ? 'cursor-pointer transition-colors hover:bg-primary/10' : ''}`}
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
    </>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const identifier = user?.email ?? user?.telefone ?? '';

  if (!user) return null;
  if (user.role === 'CANDIDATO') return <CandidateHome user={user} identifier={identifier} />;

  return <RhHome />;
}
