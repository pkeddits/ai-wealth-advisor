import { CheckCircle2, CircleDashed, Clock3 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { riskProfileLabel } from '../utils/labels';

const ROADMAP = [
  { label: 'Conta e autenticação', status: 'done' },
  { label: 'Carteiras e transações no banco de dados', status: 'next' },
  { label: 'Cotações de mercado', status: 'next' },
  { label: 'Contas e gastos via Open Finance', status: 'planned' },
  { label: 'Explicações com IA', status: 'planned' },
] as const;

const STATUS = {
  done: { icon: CheckCircle2, text: 'Concluído', className: 'text-primary-500' },
  next: { icon: Clock3, text: 'Próxima etapa', className: 'text-accent-400' },
  planned: { icon: CircleDashed, text: 'Planejado', className: 'text-dark-500' },
};

export function AccountHomePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const memberSince = new Date(user.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-2xl sm:text-3xl">Olá, {user.name || 'investidor'}</h1>
        <p className="mt-1 text-dark-600">Sua conta está ativa. Os módulos financeiros serão conectados a ela nas próximas etapas.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <section className="panel p-6" aria-labelledby="conta-titulo">
          <h2 id="conta-titulo" className="text-lg font-semibold">Sua conta</h2>
          <dl className="mt-5 divide-y divide-dark-200/70 text-sm">
            {[
              ['Nome', user.name || '—'],
              ['E-mail', user.email],
              ['Perfil de investidor', riskProfileLabel(user.riskProfile)],
              ['Conta criada em', memberSince],
            ].map(([term, value]) => (
              <div key={term} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-dark-500">{term}</dt>
                <dd className="truncate text-right font-medium text-dark-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel p-6" aria-labelledby="etapas-titulo">
          <h2 id="etapas-titulo" className="text-lg font-semibold">Desenvolvimento</h2>
          <ul className="mt-5 space-y-2">
            {ROADMAP.map((item) => {
              const { icon: Icon, text, className } = STATUS[item.status];
              return (
                <li key={item.label} className="flex items-center gap-3 rounded-control border border-dark-200/70 bg-dark-50/60 px-4 py-3">
                  <Icon className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />
                  <span className="text-sm text-dark-800">{item.label}</span>
                  <span className={`ml-auto text-xs ${className}`}>{text}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
