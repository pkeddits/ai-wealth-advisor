import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { isDemoMode } from '../../config/appMode';

interface ComingSoonProps {
  title: string;
  description: string;
  message?: string;
  action?: { to: string; label: string };
}

const DEFAULT_MESSAGE = isDemoMode
  ? 'Este módulo ainda não está disponível nesta versão. Enquanto isso, você pode criar carteiras e registrar transações.'
  : 'Este módulo será conectado ao banco de dados nas próximas etapas.';

const DEFAULT_ACTION = isDemoMode ? { to: '/portfolios', label: 'Ir para carteiras' } : { to: '/dashboard', label: 'Voltar ao painel' };

export function ComingSoon({ title, description, message = DEFAULT_MESSAGE, action = DEFAULT_ACTION }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl">{title}</h1>
        <p className="mt-1 text-dark-600">{description}</p>
      </div>
      <div className="panel relative isolate overflow-hidden px-6 py-14 text-center">
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" aria-hidden="true" />
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-500/30 bg-accent-500/10 text-accent-400">
          <Wrench className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Em desenvolvimento</h2>
        <p className="mx-auto mt-2 max-w-md text-dark-600">{message}</p>
        <Link
          to={action.to}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-control bg-primary-500 px-5 font-semibold text-dark-50 transition-[background-color,box-shadow] hover:bg-primary-700 hover:shadow-glow"
        >
          {action.label}
        </Link>
      </div>
    </div>
  );
}
