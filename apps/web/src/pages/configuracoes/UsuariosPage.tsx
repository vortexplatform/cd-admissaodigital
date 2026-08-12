import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Link, Pencil, Plus, ShieldCheck, Unlink, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Empresa, type User } from '@/context/AuthContext';
import api from '@/lib/api';

interface EmpresaUsuario {
  id: number;
  user: User;
}

interface UserWithEmpresas extends User {
  empresas: { empresa: Empresa }[];
}

const usuarioSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome'),
    cpf: z.string().trim().min(1, 'Informe o CPF'),
    email: z.string().trim().email('Informe um e-mail válido').or(z.literal('')),
    telefone: z.string().trim().optional(),
    role: z.enum(['RH', 'ADMIN']),
    empresaId: z.string().trim().min(1, 'Selecione uma empresa'),
  })
  .refine((values) => values.email || values.telefone, {
    message: 'Informe e-mail ou telefone',
    path: ['email'],
  });

type UsuarioForm = z.infer<typeof usuarioSchema>;

export default function UsuariosPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<EmpresaUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Estado de edição
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<'RH' | 'ADMIN'>('RH');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estado de vínculo com empresa
  const [linkingUserId, setLinkingUserId] = useState<number | null>(null);
  const [linkEmpresaId, setLinkEmpresaId] = useState('');
  const [userEmpresas, setUserEmpresas] = useState<Empresa[]>([]);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: { nome: '', cpf: '', email: '', telefone: '', role: 'RH', empresaId: '' },
  });

  const empresaId = watch('empresaId');

  const loadUsuarios = async (selectedEmpresaId: string) => {
    if (!selectedEmpresaId) {
      setUsuarios([]);
      return;
    }

    const { data } = await api.get<EmpresaUsuario[]>(`/empresas/${selectedEmpresaId}/usuarios`);
    setUsuarios(data);
  };

  useEffect(() => {
    api
      .get<Empresa[]>('/empresas')
      .then(({ data }) => {
        setEmpresas(data);
        if (data[0]) setValue('empresaId', String(data[0].id));
      })
      .catch(() => setError('Não foi possível carregar as empresas.'))
      .finally(() => setIsLoading(false));
  }, [setValue]);

  useEffect(() => {
    loadUsuarios(empresaId).catch(() => setError('Não foi possível carregar usuários vinculados.'));
  }, [empresaId]);

  const onSubmit = async (values: UsuarioForm) => {
    setIsSaving(true);
    setError('');

    try {
      await api.post('/users/admin', {
        nome: values.nome,
        cpf: values.cpf,
        email: values.email || undefined,
        telefone: values.telefone || undefined,
        role: values.role,
        empresaId: Number(values.empresaId),
      });
      await loadUsuarios(values.empresaId);
      reset({
        nome: '',
        cpf: '',
        email: '',
        telefone: '',
        role: 'RH',
        empresaId: values.empresaId,
      });
    } catch {
      setError('Não foi possível criar o usuário. Verifique duplicidade de CPF/e-mail/telefone.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRole = (user: User) => {
    setEditingUserId(user.id);
    setEditRole(user.role as 'RH' | 'ADMIN');
    setLinkingUserId(null);
  };

  const handleSaveRole = async (userId: number) => {
    setIsSavingEdit(true);
    try {
      await api.patch(`/users/${userId}`, { role: editRole });
      await loadUsuarios(empresaId);
      setEditingUserId(null);
    } catch {
      setError('Não foi possível atualizar o perfil do usuário.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const loadUserEmpresas = async (userId: number) => {
    setIsLoadingEmpresas(true);
    try {
      const { data } = await api.get<UserWithEmpresas[]>('/users');
      const user = data.find((u) => u.id === userId);
      setUserEmpresas(user?.empresas.map((e) => e.empresa) ?? []);
    } catch {
      setUserEmpresas([]);
    } finally {
      setIsLoadingEmpresas(false);
    }
  };

  const handleOpenLinkEmpresas = async (userId: number) => {
    setLinkingUserId(userId);
    setEditingUserId(null);
    setLinkEmpresaId('');
    await loadUserEmpresas(userId);
  };

  const handleVincularEmpresa = async (userId: number) => {
    if (!linkEmpresaId) return;
    try {
      await api.post(`/empresas/${linkEmpresaId}/usuarios`, { userId });
      await loadUserEmpresas(userId);
      await loadUsuarios(empresaId);
      setLinkEmpresaId('');
    } catch {
      setError('Não foi possível vincular o usuário à empresa.');
    }
  };

  const handleDesvincularEmpresa = async (userId: number, empresaIdToRemove: number) => {
    try {
      await api.delete(`/empresas/${empresaIdToRemove}/usuarios/${userId}`);
      await loadUserEmpresas(userId);
      await loadUsuarios(empresaId);
    } catch {
      setError('Não foi possível desvincular o usuário da empresa.');
    }
  };

  const empresasNaoVinculadas = empresas.filter(
    (e) => !userEmpresas.some((ue) => ue.id === e.id),
  );

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Usuários por empresa"
        description="Crie usuários RH ou administradores e vincule o acesso à empresa correta."
      />

      <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card className="">
          <CardHeader>
            <CardTitle>Novo usuário</CardTitle>
            <CardDescription>
              O usuário definirá a senha no primeiro acesso via CPF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empresaId">Empresa</Label>
                <select
                  id="empresaId"
                  {...register('empresaId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
                {errors.empresaId && (
                  <p className="text-sm text-destructive">{errors.empresaId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" placeholder="Nome completo" {...register('nome')} />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" placeholder="Somente números" {...register('cpf')} />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" placeholder="usuario@empresa.com" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="Opcional se informar e-mail"
                  {...register('telefone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <select
                  id="role"
                  {...register('role')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="RH">RH</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={isSaving || isLoading} className="w-full">
                <Plus className="h-4 w-4" />
                {isSaving ? 'Criando...' : 'Criar e vincular'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle>Usuários vinculados</CardTitle>
            <CardDescription>{usuarios.length} usuário(s) na empresa selecionada.</CardDescription>
          </CardHeader>
          <CardContent>
            {usuarios.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background p-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Nenhum usuário vinculado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie o primeiro usuário usando o formulário ao lado.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <div className="hidden grid-cols-[1fr_8rem_12rem_auto] gap-4 border-b bg-muted/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                  <span>Usuário</span>
                  <span>Perfil</span>
                  <span>Contato</span>
                  <span>Ações</span>
                </div>
                <div className="divide-y">
                  {usuarios.map((vinculo) => (
                    <div key={vinculo.id}>
                      <div className="grid gap-3 bg-background px-4 py-4 md:grid-cols-[1fr_8rem_12rem_auto] md:items-center">
                        <div>
                          <p className="font-semibold">{vinculo.user.nome ?? 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">CPF {vinculo.user.cpf}</p>
                        </div>

                        {editingUserId === vinculo.user.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as 'RH' | 'ADMIN')}
                              className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="RH">RH</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </div>
                        ) : (
                          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                            {vinculo.user.role}
                          </span>
                        )}

                        <p className="truncate text-sm text-muted-foreground">
                          {vinculo.user.email ?? vinculo.user.telefone ?? 'Sem contato'}
                        </p>

                        <div className="flex items-center gap-1">
                          {editingUserId === vinculo.user.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveRole(vinculo.user.id)}
                                disabled={isSavingEdit}
                              >
                                {isSavingEdit ? 'Salvando...' : 'Salvar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUserId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Editar perfil"
                                onClick={() => handleEditRole(vinculo.user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Gerenciar empresas"
                                onClick={() => handleOpenLinkEmpresas(vinculo.user.id)}
                              >
                                <Building2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {linkingUserId === vinculo.user.id && (
                        <div className="border-t bg-muted/30 px-4 py-4">
                          <p className="mb-3 text-sm font-semibold">
                            Empresas vinculadas a {vinculo.user.nome}
                          </p>

                          {isLoadingEmpresas ? (
                            <p className="text-sm text-muted-foreground">Carregando...</p>
                          ) : (
                            <>
                              {userEmpresas.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                  {userEmpresas.map((emp) => (
                                    <span
                                      key={emp.id}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm"
                                    >
                                      {emp.nome}
                                      <button
                                        type="button"
                                        title="Desvincular"
                                        className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                                        onClick={() =>
                                          handleDesvincularEmpresa(vinculo.user.id, emp.id)
                                        }
                                      >
                                        <Unlink className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {userEmpresas.length === 0 && (
                                <p className="mb-3 text-sm text-muted-foreground">
                                  Nenhuma empresa vinculada.
                                </p>
                              )}

                              {empresasNaoVinculadas.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={linkEmpresaId}
                                    onChange={(e) => setLinkEmpresaId(e.target.value)}
                                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <option value="">Selecione uma empresa</option>
                                    {empresasNaoVinculadas.map((emp) => (
                                      <option key={emp.id} value={emp.id}>
                                        {emp.nome}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!linkEmpresaId}
                                    onClick={() => handleVincularEmpresa(vinculo.user.id)}
                                  >
                                    <Link className="h-4 w-4" />
                                    Vincular
                                  </Button>
                                </div>
                              )}

                              <div className="mt-2 flex justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setLinkingUserId(null)}
                                >
                                  Fechar
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
