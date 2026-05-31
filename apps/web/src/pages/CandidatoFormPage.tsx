import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, BriefcaseBusiness, Edit3, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  INSCRITO: 'Inscrito',
  EM_ANALISE: 'Em análise',
  ENTREVISTA: 'Entrevista',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  DESISTIU: 'Desistiu',
  CANCELADO: 'Cancelado',
};

interface Empresa {
  id: number;
  nome: string;
}

interface RequisicaoResumo {
  id: number;
  empresa: Empresa | null;
  dataPrevistaAdmissao: string | null;
  createdAt: string;
}

interface CandidaturaResumo {
  id: number;
  status: string;
  requisicao: RequisicaoResumo;
  createdAt: string;
}

interface Candidato {
  id: number;
  cpf: string;
  dataNascimento: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  candidaturas: CandidaturaResumo[];
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
    <>
      <PageHeader
        eyebrow="Admissão digital"
        title={getPageTitle(mode)}
        description={
          isViewMode
            ? 'Consulte os dados do candidato e as candidaturas vinculadas.'
            : 'Preencha os dados pessoais usados nas requisições de admissão.'
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/candidatos')}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

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
                    {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
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
                      <p className="text-sm text-destructive">{errors.dataNascimento.message}</p>
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
              <CardTitle>Candidaturas vinculadas</CardTitle>
              <CardDescription>
                {candidato?.candidaturas.length ?? 0} vínculo(s) encontrado(s).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mode === 'create' || !candidato || candidato.candidaturas.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background p-6 text-center">
                  <BriefcaseBusiness className="mx-auto h-7 w-7 text-muted-foreground" />
                  <p className="mt-2 font-semibold">Nenhuma candidatura vinculada</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O vínculo é feito na lista de requisições.
                  </p>
                </div>
              ) : (
                candidato.candidaturas.map((candidatura) => (
                  <div key={candidatura.id} className="rounded-xl border bg-background p-4">
                    <p className="font-semibold">
                      {candidatura.requisicao.empresa?.nome ?? 'Empresa não vinculada'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Etapa: {statusLabels[candidatura.status] ?? candidatura.status}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Admissão prevista:{' '}
                      {toDateInputValue(candidatura.requisicao.dataPrevistaAdmissao) || '-'}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}
