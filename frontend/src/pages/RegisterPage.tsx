import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button, Input, Select, Card, CardBody, LoadingSpinner } from '../components/common';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  riskProfile: z.enum(['conservador', 'moderado', 'arrojado']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const riskProfiles = [
  { value: 'conservador', label: 'Conservador - Baixo risco, renda fixa' },
  { value: 'moderado', label: 'Moderado - Equilibrado risco/retorno' },
  { value: 'arrojado', label: 'Arrojado - Alto risco, maior potencial' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    try {
      await registerUser({ email: data.email, password: data.password, name: data.name, riskProfile: data.riskProfile });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-dark-900">AI Wealth Advisor</span>
        </Link>
        <h1 className="text-2xl font-bold text-dark-900">Crie sua conta</h1>
        <p className="text-dark-600 mt-2">Comece a investir com inteligência artificial</p>
      </div>

      <Card>
        <CardBody>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Nome completo"
              type="text"
              placeholder="João Silva"
              error={errors.name?.message}
              {...register('name')}
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmar senha"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600"
                aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Perfil de risco</label>
              <Select
                label=""
                placeholder="Selecione seu perfil"
                options={riskProfiles}
                error={errors.riskProfile?.message}
                {...register('riskProfile')}
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-dark-600">
                Aceito os <Link to="/terms" className="text-primary-600 hover:underline">Termos de Uso</Link> e a{' '}
                <Link to="/privacy" className="text-primary-600 hover:underline">Política de Privacidade</Link>
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : 'Criar conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-600">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
