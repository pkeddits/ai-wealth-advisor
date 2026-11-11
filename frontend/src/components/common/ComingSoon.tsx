import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
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
        <h1 className="text-display text-3xl">{title}</h1>
        <p className="mt-1 text-dark-600">{description}</p>
      </div>
      <div className="panel-feature isolate overflow-hidden px-6 py-16 text-center">
        <div className="absolute inset-0 -z-10 bg-grid opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" aria-hidden="true" />
        <motion.span
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700"
          initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <span className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-xl" aria-hidden="true" />
          <Wrench className="relative h-6 w-6" aria-hidden="true" />
        </motion.span>
        <h2 className="mt-5 text-xl font-semibold">Em desenvolvimento</h2>
        <p className="mx-auto mt-2 max-w-md text-dark-600">{message}</p>
        <Link
          to={action.to}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-control bg-brand px-5 font-semibold text-on-brand transition-shadow hover:shadow-glow"
        >
          {action.label}
        </Link>
      </div>
    </div>
  );
}
