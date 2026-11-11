import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/common';
import { FormAlert, PasswordInput } from '../components/auth';
import { isSupabaseMode } from '../config/appMode';
import { supabaseConfigError } from '../lib/supabase';
import { errorMessage } from '../lib/errorMessage';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe pelo menos 2 caracteres').max(120, 'Use no máximo 120 caracteres'),
    email: z.string().trim().email('Informe um e-mail válido'),
    password: z
      .string()
      .min(8, 'Use pelo menos 8 caracteres')
      .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
      .regex(/\d/, 'Inclua pelo menos um número'),
    confirmPassword: z.string(),
    riskProfile: z.enum(['conservador', 'moderado', 'arrojado']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const RISK_PROFILES: { value: RegisterForm['riskProfile']; label: string; description: string }[] = [
  { value: 'conservador', label: 'Conservador', description: 'Prioriza segurança e estabilidade' },
  { value: 'moderado', label: 'Moderado', description: 'Equilibra risco e retorno' },
  { value: 'arrojado', label: 'Arrojado', description: 'Aceita oscilações por mais retorno' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const configError = isSupabaseMode ? supabaseConfigError : null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { riskProfile: 'moderado' },
  });
  const selectedProfile = watch('riskProfile');

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        riskProfile: data.riskProfile,
      });
      if (result.requiresEmailConfirmation) setPendingEmail(data.email);
      else navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível criar a conta. Tente novamente.'));
    }
  };

  if (pendingEmail) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-500">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-display mt-6 text-2xl">Confirme seu e-mail</h1>
        <p className="mt-3 text-dark-600">
          Enviamos um link de confirmação para <strong className="font-medium text-dark-900">{pendingEmail}</strong>.
          Depois de confirmar, entre com seu e-mail e senha.
        </p>
        <Link to="/login" className="mt-8 inline-flex h-11 items-center justify-center rounded-control border border-dark-200 bg-dark-100 px-5 font-medium text-dark-900 hover:bg-dark-200">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-display text-3xl">Criar conta</h1>
      <p className="mt-3 text-dark-600">Seus dados ficam vinculados somente à sua conta.</p>

      <div className="mt-6 space-y-3">
        {configError && <FormAlert>{configError}</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <Input {...register('name')} id="name" label="Nome" autoComplete="name" error={errors.name?.message} disabled={Boolean(configError)} />
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
        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordInput {...register('password')} id="password" label="Senha" autoComplete="new-password" error={errors.password?.message} disabled={Boolean(configError)} />
          <PasswordInput {...register('confirmPassword')} id="confirmPassword" label="Confirmar senha" autoComplete="new-password" error={errors.confirmPassword?.message} disabled={Boolean(configError)} />
        </div>
        <p className="-mt-2 text-xs text-dark-500">Mínimo de 8 caracteres, com letras e números.</p>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-dark-700">Perfil de investidor</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {RISK_PROFILES.map((profile) => (
              <label
                key={profile.value}
                className={clsx(
                  'cursor-pointer rounded-control border px-3 py-2.5 transition-colors has-[:focus-visible]:shadow-focus',
                  selectedProfile === profile.value ? 'border-primary-500/60 bg-primary-500/10' : 'border-dark-200 bg-dark-50/60 hover:border-dark-300',
                )}
              >
                <input type="radio" value={profile.value} {...register('riskProfile')} className="sr-only" disabled={Boolean(configError)} />
                <span className="block text-sm font-medium text-dark-900">{profile.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-dark-500">{profile.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={Boolean(configError)}>
          Criar conta
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-dark-600">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Entrar
        </Link>
      </p>
    </div>
  );
}
