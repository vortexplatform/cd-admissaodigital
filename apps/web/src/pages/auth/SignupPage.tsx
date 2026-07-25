import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const signupSchema = z.object({
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Informe um CPF válido'),
  identifier: z
    .string()
    .trim()
    .min(1, 'Informe e-mail ou telefone')
    .refine(
      (value) => value.includes('@') || /^\+?[\d\s\-()]{10,}$/.test(value),
      'Informe um e-mail ou telefone válido',
    ),
});

const onlyDigits = (value: string) => value.replace(/\D/g, '');

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { cpf: '', identifier: '' },
  });

  const onSubmit = async ({ cpf, identifier }: SignupForm) => {
    setIsLoading(true);
    setError('');
    const normalizedCpf = onlyDigits(cpf);

    try {
      await api.post('/auth/send-otp', { identifier, cpf: normalizedCpf });
      navigate(`/verify-otp?identifier=${encodeURIComponent(identifier)}&cpf=${normalizedCpf}`);
    } catch {
      setError('Não foi possível iniciar seu cadastro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Criar acesso</CardTitle>
        <CardDescription>
          Informe seu CPF e e-mail ou telefone para receber o código de primeiro acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-cpf">CPF</Label>
            <Input
              id="signup-cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              {...register('cpf')}
            />
            {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-identifier">E-mail ou telefone</Label>
            <Input
              id="signup-identifier"
              placeholder="seu@email.com ou +55 11 99999-9999"
              autoComplete="email"
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Receber código'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem acesso?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
