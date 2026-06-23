import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const emailSchema = z.object({ identifier: z.string().email('E-mail inválido') });
const phoneSchema = z.object({
  identifier: z
    .string()
    .min(10, 'Telefone inválido')
    .regex(/^\+?[\d\s\-()]+$/, 'Telefone inválido'),
});

type FormValues = { identifier: string };

function IdentifierForm({ type }: { type: 'email' | 'phone' }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const schema = type === 'email' ? emailSchema : phoneSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ identifier }: FormValues) => {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { identifier });
      navigate(`/verify-otp?identifier=${encodeURIComponent(identifier)}`);
    } catch {
      setError('Não foi possível enviar o código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">{type === 'email' ? 'E-mail' : 'Telefone'}</Label>
        <Input
          id="identifier"
          type={type === 'email' ? 'email' : 'tel'}
          placeholder={type === 'email' ? 'seu@email.com' : '+55 11 99999-9999'}
          autoComplete={type === 'email' ? 'email' : 'tel'}
          {...register('identifier')}
        />
        {errors.identifier && (
          <p className="text-sm text-destructive">{errors.identifier.message}</p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Enviando...' : 'Enviar código'}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm shadow-corporate">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Admissão Digital</CardTitle>
        <CardDescription>
          Entre com seu e-mail ou telefone para receber um código de acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="email" className="flex-1">
              E-mail
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex-1">
              Telefone
            </TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <IdentifierForm type="email" />
          </TabsContent>
          <TabsContent value="phone">
            <IdentifierForm type="phone" />
          </TabsContent>
        </Tabs>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Primeiro acesso?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Criar cadastro
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
