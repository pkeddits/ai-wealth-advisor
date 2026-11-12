import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/common';
import { FormAlert, PasswordInput } from '../components/auth';
import { isDemoMode, isSupabaseMode } from '../config/appMode';
import { supabaseConfigError } from '../lib/supabase';
import { errorMessage } from '../lib/errorMessage';
import { usePreferences } from '../store/preferencesStore';

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

type LoginForm = z.infer<typeof loginSchema>;

function useRedirectTarget() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  // Só caminhos internos: barra dupla e barra invertida podem levar a outro domínio.
  return from && /^\/(?![\/\\])/.test(from) && !from.includes('\\') ? from : usePreferences.getState().homePage;
}

function DemoEntry() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const target = useRedirectTarget();
  const [error, setError] = useState('');
  const [entering, setEntering] = useState(false);

  const enter = async () => {
    setError('');
    setEntering(true);
    try {
      await login('', '');
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível iniciar a demonstração. Recarregue a página.'));
      setEntering(false);
    }
  };

  return (
    <div>
      <span className="chip-live">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
        Modo demonstração
      </span>
      <h1 className="text-display mt-5 text-3xl">Explore o painel</h1>
      <p className="mt-3 text-dark-600">
        Crie carteiras, registre compras e vendas e acompanhe o dashboard. Os dados são fictícios e ficam salvos
        apenas neste navegador.
      </p>
      {error && <div className="mt-6"><FormAlert>{error}</FormAlert></div>}
      <Button className="mt-8 w-full" size="lg" onClick={enter} loading={entering}>
        Entrar na demonstração
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
      <p className="mt-5 text-center text-sm text-dark-500">Nenhuma conta ou senha é necessária.</p>
    </div>
  );
}

function CredentialsForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const initError = useAuthStore((s) => s.initError);
  const target = useRedirectTarget();
  const [error, setError] = useState('');
  const configError = isSupabaseMode ? supabaseConfigError : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.email, data.password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    }
  };

  return (
    <div>
      <h1 className="text-display text-3xl">Entrar</h1>
      <p className="mt-3 text-dark-600">Acesse sua conta para acompanhar seu patrimônio.</p>

      <div className="mt-6 space-y-3">
        {configError && <FormAlert>{configError}</FormAlert>}
        {!configError && initError && <FormAlert>{initError}</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <Input
          {...register('email')}
          id="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          error={errors.email?.message}
          disabled={Boolean(configError)}
        />
        <PasswordInput
          {...register('password')}
          id="password"
          label="Senha"
          autoComplete="current-password"
          error={errors.password?.message}
          disabled={Boolean(configError)}
        />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={Boolean(configError)}>
          Entrar
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-dark-600">
        Ainda não tem conta?{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export function LoginPage() {
  return isDemoMode ? <DemoEntry /> : <CredentialsForm />;
}
