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
import EmpresaSelector from '@/components/EmpresaSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const tipos = ['NOVA_VAGA', 'SUBSTITUICAO', 'AUMENTO_QUADRO', 'TEMPORARIA', 'OUTRO'] as const;
const statusList = [
  'RASCUNHO',
  'ABERTA',
  'AGUARDANDO_CANDIDATO',
  'EM_ADMISSAO',
  'AGUARDANDO_DOCUMENTOS',
  'AGUARDANDO_ASSINATURA',
  'AGUARDANDO_RH',
  'PENDENTE_CORRECAO',
  'APROVADA',
  'INTEGRANDO_SENIOR',
  'INTEGRADA_SENIOR',
  'CANCELADA',
  'REPROVADA',
  'ERRO_INTEGRACAO',
] as const;

type TipoRequisicao = (typeof tipos)[number];
type StatusRequisicao = (typeof statusList)[number];

interface Empresa {
  id: number;
  nome: string;
}

interface Candidato {
  id: number;
  nome: string | null;
  cpf: string;
}

interface Requisicao {
  id: number;
  tipo: TipoRequisicao;
  status: StatusRequisicao;
  empresaId: number | null;
  empresa: Empresa | null;
  candidatoId: number | null;
  candidato: Candidato | null;
  filial: number | null;
  filialNome: string | null;
  cargo: string | null;
  cargoNome: string | null;
  centroCusto: string | null;
  ccustoNome: string | null;
  escala: string | null;
  descricaoEscala: string | null;
  sindicato: string | null;
  dataPrevistaAdmissao: string | null;
  motivoAbertura: string | null;
  observacao: string | null;
  codigoRequisicaoSenior: string | null;
  codigoCandidatoSenior: string | null;
  codigoColaboradorSenior: string | null;
  createdAt: string;
}

const requisicaoSchema = z.object({
  tipo: z.enum(tipos),
  status: z.enum(statusList),
  empresaId: z.string().optional(),
  candidatoId: z.string().optional(),
  filial: z.string().trim().optional(),
  filialNome: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  cargoNome: z.string().trim().min(1, 'Informe o nome do cargo'),
  centroCusto: z.string().trim().optional(),
  ccustoNome: z.string().trim().optional(),
  escala: z.string().trim().optional(),
  descricaoEscala: z.string().trim().optional(),
  sindicato: z.string().trim().optional(),
  dataPrevistaAdmissao: z.string().optional(),
  motivoAbertura: z.string().trim().optional(),
  observacao: z.string().trim().optional(),
  codigoRequisicaoSenior: z.string().trim().optional(),
  codigoCandidatoSenior: z.string().trim().optional(),
  codigoColaboradorSenior: z.string().trim().optional(),
});

type RequisicaoForm = z.infer<typeof requisicaoSchema>;

const defaultValues: RequisicaoForm = {
  tipo: 'NOVA_VAGA',
  status: 'RASCUNHO',
  empresaId: '',
  candidatoId: '',
  filial: '',
  filialNome: '',
  cargo: '',
  cargoNome: '',
  centroCusto: '',
  ccustoNome: '',
  escala: '',
  descricaoEscala: '',
  sindicato: '',
  dataPrevistaAdmissao: '',
  motivoAbertura: '',
  observacao: '',
  codigoRequisicaoSenior: '',
  codigoCandidatoSenior: '',
  codigoColaboradorSenior: '',
};

const labels: Record<string, string> = {
  NOVA_VAGA: 'Nova vaga',
  SUBSTITUICAO: 'Substituição',
  AUMENTO_QUADRO: 'Aumento de quadro',
  TEMPORARIA: 'Temporária',
  OUTRO: 'Outro',
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

const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : '');
const toText = (value: string | number | null | undefined) => (value == null ? '' : String(value));
const optionalString = (value?: string) => value?.trim() || undefined;
const formatCpf = (value: string) => value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const optionalNumber = (value?: string) => {
  const text = value?.trim();
  return text ? Number(text) : undefined;
};

export default function RequisicoesPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [editingRequisicao, setEditingRequisicao] = useState<Requisicao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequisicaoForm>({ resolver: zodResolver(requisicaoSchema), defaultValues });

  const loadData = async () => {
    const [requisicoesResponse, empresasResponse, candidatosResponse] = await Promise.all([
      api.get<Requisicao[]>('/requisicoes'),
      api.get<Empresa[]>('/empresas'),
      api.get<Candidato[]>('/candidatos'),
    ]);
    setRequisicoes(requisicoesResponse.data);
    setEmpresas(empresasResponse.data);
    setCandidatos(candidatosResponse.data);
  };

  useEffect(() => {
    loadData()
      .catch(() => setError('Não foi possível carregar as requisições.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clearForm = () => {
    setEditingRequisicao(null);
    reset(defaultValues);
  };

  const startEditing = (requisicao: Requisicao) => {
    setEditingRequisicao(requisicao);
    reset({
      tipo: requisicao.tipo,
      status: requisicao.status,
      empresaId: toText(requisicao.empresaId),
      candidatoId: toText(requisicao.candidatoId),
      filial: toText(requisicao.filial),
      filialNome: toText(requisicao.filialNome),
      cargo: toText(requisicao.cargo),
      cargoNome: toText(requisicao.cargoNome),
      centroCusto: toText(requisicao.centroCusto),
      ccustoNome: toText(requisicao.ccustoNome),
      escala: toText(requisicao.escala),
      descricaoEscala: toText(requisicao.descricaoEscala),
      sindicato: toText(requisicao.sindicato),
      dataPrevistaAdmissao: toDateInputValue(requisicao.dataPrevistaAdmissao),
      motivoAbertura: toText(requisicao.motivoAbertura),
      observacao: toText(requisicao.observacao),
      codigoRequisicaoSenior: toText(requisicao.codigoRequisicaoSenior),
      codigoCandidatoSenior: toText(requisicao.codigoCandidatoSenior),
      codigoColaboradorSenior: toText(requisicao.codigoColaboradorSenior),
    });
  };

  const buildPayload = (values: RequisicaoForm) => ({
    tipo: values.tipo,
    status: values.status,
    empresaId: optionalNumber(values.empresaId),
    candidatoId: optionalNumber(values.candidatoId),
    filial: optionalNumber(values.filial),
    filialNome: optionalString(values.filialNome),
    cargo: optionalString(values.cargo),
    cargoNome: optionalString(values.cargoNome),
    centroCusto: optionalString(values.centroCusto),
    ccustoNome: optionalString(values.ccustoNome),
    escala: optionalString(values.escala),
    descricaoEscala: optionalString(values.descricaoEscala),
    sindicato: optionalString(values.sindicato),
    dataPrevistaAdmissao: optionalString(values.dataPrevistaAdmissao),
    motivoAbertura: optionalString(values.motivoAbertura),
    observacao: optionalString(values.observacao),
    codigoRequisicaoSenior: optionalString(values.codigoRequisicaoSenior),
    codigoCandidatoSenior: optionalString(values.codigoCandidatoSenior),
    codigoColaboradorSenior: optionalString(values.codigoColaboradorSenior),
  });

  const onSubmit = async (values: RequisicaoForm) => {
    setIsSaving(true);
    setError('');

    try {
      if (editingRequisicao) {
        await api.patch(`/requisicoes/${editingRequisicao.id}`, buildPayload(values));
      } else {
        await api.post('/requisicoes', buildPayload(values));
      }

      await loadData();
      clearForm();
    } catch {
      setError('Não foi possível salvar a requisição. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeRequisicao = async (requisicao: Requisicao) => {
    const title = requisicao.cargoNome ?? requisicao.cargo ?? `#${requisicao.id}`;
    const confirmed = window.confirm(`Excluir a requisição "${title}"?`);
    if (!confirmed) return;

    setError('');
    try {
      await api.delete(`/requisicoes/${requisicao.id}`);
      await loadData();
      if (editingRequisicao?.id === requisicao.id) clearForm();
    } catch {
      setError('Não foi possível excluir a requisição.');
    }
  };

  return (
    <div className="app-surface min-h-screen text-foreground">
      <header className="flex flex-col gap-4 border-b bg-card/95 px-4 py-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none">Requisições</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastro operacional de vagas e admissões
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
                className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-left text-primary-foreground"
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
                Requisições de vaga
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Cadastre, edite, acompanhe e remova requisições com os dados de filial, cargo,
                centro de custo e escala.
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

          <section className="grid gap-4 xl:grid-cols-[26rem_1fr]">
            <Card className="shadow-corporate">
              <CardHeader>
                <CardTitle>{editingRequisicao ? 'Editar requisição' : 'Nova requisição'}</CardTitle>
                <CardDescription>Preencha os dados operacionais da vaga.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <select
                        id="tipo"
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        {...register('tipo')}
                      >
                        {tipos.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {labels[tipo]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        {...register('status')}
                      >
                        {statusList.map((status) => (
                          <option key={status} value={status}>
                            {labels[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="empresaId">Empresa</Label>
                    <select
                      id="empresaId"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      {...register('empresaId')}
                    >
                      <option value="">Sem empresa vinculada</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="candidatoId">Candidato</Label>
                    <select
                      id="candidatoId"
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      {...register('candidatoId')}
                    >
                      <option value="">Sem candidato vinculado</option>
                      {candidatos.map((candidato) => (
                        <option key={candidato.id} value={candidato.id}>
                          {candidato.nome || formatCpf(candidato.cpf)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="filial">Código filial</Label>
                      <Input
                        id="filial"
                        type="number"
                        placeholder="Ex.: 3"
                        {...register('filial')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filialNome">Filial nome</Label>
                      <Input
                        id="filialNome"
                        placeholder="Ex.: Filial Centro"
                        {...register('filialNome')}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Código cargo</Label>
                      <Input id="cargo" placeholder="Ex.: 1020" {...register('cargo')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargoNome">Cargo nome</Label>
                      <Input
                        id="cargoNome"
                        placeholder="Ex.: Operador de loja"
                        {...register('cargoNome')}
                      />
                      {errors.cargoNome && (
                        <p className="text-sm text-destructive">{errors.cargoNome.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="centroCusto">Código centro de custo</Label>
                      <Input
                        id="centroCusto"
                        placeholder="Ex.: 01.02"
                        {...register('centroCusto')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ccustoNome">Centro de custo nome</Label>
                      <Input
                        id="ccustoNome"
                        placeholder="Ex.: Frente de loja"
                        {...register('ccustoNome')}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="escala">Código escala</Label>
                      <Input id="escala" placeholder="Ex.: 6X1" {...register('escala')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricaoEscala">Descrição escala</Label>
                      <Input
                        id="descricaoEscala"
                        placeholder="Ex.: Segunda a sábado"
                        {...register('descricaoEscala')}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sindicato">Sindicato</Label>
                      <Input
                        id="sindicato"
                        placeholder="Ex.: Comerciários"
                        {...register('sindicato')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataPrevistaAdmissao">Admissão prevista</Label>
                      <Input
                        id="dataPrevistaAdmissao"
                        type="date"
                        {...register('dataPrevistaAdmissao')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivoAbertura">Motivo abertura</Label>
                    <Input
                      id="motivoAbertura"
                      placeholder="Ex.: Substituição por desligamento"
                      {...register('motivoAbertura')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observação</Label>
                    <textarea
                      id="observacao"
                      rows={3}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Detalhes adicionais da requisição"
                      {...register('observacao')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="codigoRequisicaoSenior">Req. Senior</Label>
                      <Input id="codigoRequisicaoSenior" {...register('codigoRequisicaoSenior')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codigoCandidatoSenior">Cand. Senior</Label>
                      <Input id="codigoCandidatoSenior" {...register('codigoCandidatoSenior')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codigoColaboradorSenior">Colab. Senior</Label>
                      <Input
                        id="codigoColaboradorSenior"
                        {...register('codigoColaboradorSenior')}
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={isSaving} className="w-full">
                      {editingRequisicao ? (
                        <Save className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {isSaving
                        ? 'Salvando...'
                        : editingRequisicao
                          ? 'Salvar alterações'
                          : 'Cadastrar'}
                    </Button>
                    {editingRequisicao && (
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
                <CardTitle>Requisições cadastradas</CardTitle>
                <CardDescription>
                  {requisicoes.length} requisição(ões) disponível(is).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando requisições...</p>
                ) : requisicoes.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-background p-8 text-center">
                    <BriefcaseBusiness className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 font-semibold">Nenhuma requisição cadastrada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use o formulário ao lado para criar o primeiro registro.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="hidden grid-cols-[1.2fr_1fr_10rem_11rem] gap-4 border-b bg-muted/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
                      <span>Cargo</span>
                      <span>Local</span>
                      <span>Status</span>
                      <span className="text-right">Ações</span>
                    </div>
                    <div className="divide-y">
                      {requisicoes.map((requisicao) => (
                        <div
                          key={requisicao.id}
                          className="grid gap-3 bg-background px-4 py-4 lg:grid-cols-[1.2fr_1fr_10rem_11rem] lg:items-center"
                        >
                          <div>
                            <p className="font-semibold">
                              {requisicao.cargoNome ?? requisicao.cargo ?? 'Cargo não informado'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {labels[requisicao.tipo]}
                              {requisicao.dataPrevistaAdmissao
                                ? ` · ${toDateInputValue(requisicao.dataPrevistaAdmissao)}`
                                : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {requisicao.candidato?.nome ?? 'Candidato não vinculado'}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p>{requisicao.empresa?.nome ?? 'Empresa não vinculada'}</p>
                            <p className="text-xs text-muted-foreground">
                              {requisicao.filialNome ?? 'Filial não informada'}
                              {requisicao.ccustoNome ? ` · ${requisicao.ccustoNome}` : ''}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                            {labels[requisicao.status]}
                          </span>
                          <div className="flex gap-2 lg:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(requisicao)}
                            >
                              <Edit3 className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeRequisicao(requisicao)}
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
