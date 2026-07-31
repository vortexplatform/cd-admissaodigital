import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth, type AuthSession } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

function maskIdentifier(identifier: string) {
  if (identifier.includes('@')) {
    const [local, domain] = identifier.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${identifier.slice(0, 4)}****${identifier.slice(-3)}`;
}

const RESEND_SECONDS = 30;

export default function OtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const identifier = searchParams.get('identifier') ?? '';
  const cpf = searchParams.get('cpf') ?? '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!identifier || !cpf) navigate('/login');
  }, [cpf, identifier, navigate]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const handleResend = async () => {
    setError('');
    try {
      await api.post('/auth/send-otp', { identifier, cpf });
      setCountdown(RESEND_SECONDS);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError('Não foi possível reenviar o código.');
    }
  };

  const handleComplete = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post<AuthSession>('/auth/verify-otp', {
        identifier,
        cpf,
        code,
      });
      login(data);
      navigate('/painel');
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(
        status === 401
          ? 'Código inválido ou expirado. Tente novamente.'
          : 'Não foi possível iniciar a sessão. Tente novamente.',
      );
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mx-auto mb-2 justify-center" />
        <CardTitle className="font-display text-2xl">Verificação</CardTitle>
        <CardDescription>
          Código enviado para{' '}
          <span className="font-medium text-foreground">{maskIdentifier(identifier)}</span>.
          <br />
          Digite os 6 dígitos abaixo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <OTPInput
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={otp}
          onChange={setOtp}
          onComplete={handleComplete}
          disabled={isLoading}
          containerClassName="flex justify-center gap-2"
          render={({ slots }) => (
            <>
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex h-12 w-10 items-center justify-center rounded-md border text-lg font-semibold transition-all',
                    slot.isActive ? 'border-primary ring-1 ring-primary' : 'border-input',
                    slot.char ? 'bg-background' : 'bg-muted/50',
                  )}
                >
                  {slot.char ?? <span className="text-muted-foreground">·</span>}
                </div>
              ))}
            </>
          )}
        />

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-sm text-muted-foreground">
              Reenviar código em <span className="font-medium">{countdown}s</span>
            </p>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleResend}>
              Reenviar código
            </Button>
          )}
        </div>

        <Button
          className="w-full"
          onClick={() => otp.length === 6 && handleComplete(otp)}
          disabled={otp.length < 6 || isLoading}
        >
          {isLoading ? 'Verificando...' : 'Confirmar'}
        </Button>

        <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
          Voltar
        </Button>
      </CardContent>
    </Card>
  );
}
