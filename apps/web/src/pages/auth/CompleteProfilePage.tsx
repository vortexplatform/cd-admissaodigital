import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, type User } from '@/context/AuthContext';
import api from '@/lib/api';

const profileSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome completo'),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Informe um CPF válido'),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional(),
  telefone: z.union([z.string().min(10, 'Telefone inválido'), z.literal('')]).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function CompleteProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const optionalField = user?.email ? 'telefone' : 'email';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: user?.nome ?? '',
      cpf: user?.cpf ?? '',
      email: user?.email ?? '',
      telefone: user?.telefone ?? '',
    },
  });

  const onSubmit = async (values: ProfileForm) => {
    setIsLoading(true);
    setError('');
    try {
      const payload = {
        nome: values.nome,
        cpf: values.cpf,
        email: optionalField === 'email' && values.email ? values.email : undefined,
        telefone: optionalField === 'telefone' && values.telefone ? values.telefone : undefined,
      };
      const { data } = await api.patch<User>('/users/me', payload);
      updateUser(data);
      navigate('/painel');
    } catch {
      setError('Não foi possível salvar seus dados. Verifique as informações e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const optionalLabel = optionalField === 'telefone' ? 'Telefone' : 'E-mail';
  const optionalType = optionalField === 'telefone' ? 'tel' : 'email';
  const optionalPlaceholder = optionalField === 'telefone' ? '+55 11 99999-9999' : 'seu@email.com';

  return (
    <Card className="w-full max-w-md border-primary/10">
      <CardHeader className="space-y-3">
        <div className="h-1.5 w-16 rounded-full bg-primary" />
        <div>
          <CardTitle className="font-display text-2xl">Complete seu cadastro</CardTitle>
          <CardDescription>
            Precisamos do seu nome e CPF para continuar sua admissão. O campo de contato
            complementar é opcional.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              autoComplete="name"
              placeholder="Seu nome completo"
              {...register('nome')}
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00" {...register('cpf')} />
            {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor={optionalField}>{optionalLabel} opcional</Label>
            <Input
              id={optionalField}
              type={optionalType}
              autoComplete={optionalField === 'telefone' ? 'tel' : 'email'}
              placeholder={optionalPlaceholder}
              {...register(optionalField)}
            />
            {errors[optionalField] && (
              <p className="text-sm text-destructive">{errors[optionalField]?.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar e continuar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
