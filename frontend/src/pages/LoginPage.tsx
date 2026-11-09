import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button, Input, Card, CardBody, LoadingSpinner } from '../components/common';
import { isDemoMode } from '../config/appMode';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const [isEnteringDemo, setIsEnteringDemo] = useState(false);

  const enterDemo = async () => {
    setError('');
    setIsEnteringDemo(true);
    try {
      // No modo demonstração o login é local e não usa credenciais.
      await login('demonstracao@aiwealth.local', 'demonstracao');
      navigate('/dashboard');
    } catch {
      setError('Não foi possível iniciar a demonstração. Recarregue a página e tente novamente.');
      setIsEnteringDemo(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  if (isDemoMode) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-dark-900">AI Wealth Advisor</span>
          </div>
          <h1 className="text-2xl font-bold text-dark-900">Versão de demonstração</h1>
          <p className="text-dark-600 mt-2">Organize carteiras e acompanhe seus investimentos</p>
        </div>

        <Card>
          <CardBody>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
                {error}
              </div>
            )}
            <p className="text-dark-700">
              Crie carteiras, registre compras e vendas e veja o dashboard atualizar. Os dados são fictícios e ficam
              salvos apenas neste navegador.
            </p>
            <Button className="w-full mt-6" size="lg" onClick={enterDemo} loading={isEnteringDemo}>
              Entrar no modo demonstração
            </Button>
            <p className="mt-4 text-sm text-dark-500 text-center">
              O acesso com conta própria será liberado quando o servidor estiver integrado.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-dark-900">Bem-vindo de volta</h1>
        <p className="text-dark-600 mt-2">Faça login para acessar sua conta</p>
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
                autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-dark-600">Lembrar-me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-600">
              Não tem conta?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
