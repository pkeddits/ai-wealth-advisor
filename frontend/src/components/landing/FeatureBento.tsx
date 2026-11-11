import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Building2, Landmark, LockKeyhole, Sparkles, Target } from 'lucide-react';
import clsx from 'clsx';
import { RevealGroup, RevealItem } from '../motion';
import { SectionHeading } from './SectionHeading';

type Status = 'live' | 'building' | 'planned';

const STATUS: Record<Status, { label: string; className: string }> = {
  live: { label: 'Implementado no banco', className: 'chip-live' },
  building: { label: 'Em desenvolvimento', className: 'chip-building' },
  planned: { label: 'Planejado', className: 'chip-planned' },
};

function Tile({ status, icon, title, text, children, className }: {
  status: Status;
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <RevealItem variant="scale" className={className}>
      <article className="panel group relative flex h-full flex-col overflow-hidden p-6 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-dark-300 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary-500/0 blur-3xl transition-colors duration-700 group-hover:bg-primary-500/15" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-200 bg-dark-100 text-primary-700">{icon}</span>
          <span className={STATUS[status].className}>{STATUS[status].label}</span>
        </div>
        <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-dark-600">{text}</p>
        {children && <div className="mt-6 flex-1">{children}</div>}
      </article>
    </RevealItem>
  );
}

function OpenFinanceFlow() {
  const sources = ['Conta corrente', 'Cartão de crédito', 'Investimentos'];
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dark-200/60 bg-dark-50/60 p-4" aria-hidden="true">
      <div className="flex flex-col gap-2">
        {sources.map((s) => (
          <span key={s} className="flex items-center gap-2 rounded-xl border border-dark-200 bg-surface px-3 py-2 text-xs text-dark-600">
            <Building2 className="h-3.5 w-3.5 text-dark-500" />
            {s}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 120 120" className="h-28 w-24 shrink-0">
        {[20, 60, 100].map((y, i) => (
          <g key={y}>
            <path d={`M0,${y} C60,${y} 60,60 120,60`} fill="none" stroke="rgb(var(--dark-300))" strokeWidth="1.2" />
            <motion.path
              d={`M0,${y} C60,${y} 60,60 120,60`}
              fill="none"
              stroke="rgb(var(--violet))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="0.12 0.88"
              pathLength={1}
              initial={{ strokeDashoffset: 1 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
            />
          </g>
        ))}
      </svg>
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-dark-900 shadow-glow">
        <Landmark className="h-6 w-6" />
      </span>
    </div>
  );
}

export function FeatureBento() {
  return (
    <section id="recursos" className="relative mx-auto max-w-7xl scroll-mt-28 px-5 py-28 sm:px-8">
      <SectionHeading eyebrow="Recursos" title="O que já existe e o que vem a seguir." align="center">
        Cada recurso mostra seu estado real de desenvolvimento.
      </SectionHeading>

      <RevealGroup className="mt-16 grid gap-4 lg:grid-cols-6" stagger={0.1}>
        <Tile
          status="planned"
          icon={<Landmark className="h-5 w-5" />}
          title="Contas pelo Open Finance"
          text="Conexão autorizada por você, no fluxo oficial da instituição. Saldos, transações e investimentos importados automaticamente."
          className="lg:col-span-4"
        >
          <OpenFinanceFlow />
        </Tile>

        <Tile
          status="live"
          icon={<LockKeyhole className="h-5 w-5" />}
          title="Seus dados, só seus"
          text="Regras de acesso no próprio banco de dados: cada conta lê e altera apenas os próprios registros. Nenhuma senha bancária é armazenada."
          className="lg:col-span-2"
        />

        <Tile
          status="planned"
          icon={<Sparkles className="h-5 w-5" />}
          title="Explicações com IA"
          text="A IA interpreta indicadores calculados pelo sistema e explica o que eles significam, em linguagem simples."
          className="lg:col-span-3"
        >
          <p className="rounded-2xl border border-accent-500/25 bg-accent-500/[0.06] px-4 py-3 text-sm text-dark-700">
            Ela não decide nem recomenda compras ou vendas: os números vêm de cálculos verificáveis.
          </p>
        </Tile>

        <Tile
          status="planned"
          icon={<Target className="h-5 w-5" />}
          title="Para quem está começando"
          text="Metas e simulação de aportes, úteis mesmo sem nenhum investimento."
          className="lg:col-span-3"
        >
          <div className="flex items-center gap-4 rounded-2xl border border-dark-200/60 bg-dark-50/60 p-4" aria-hidden="true">
            <svg viewBox="0 0 44 44" className="h-14 w-14 shrink-0 -rotate-90">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgb(var(--dark-100))" strokeWidth="5" />
              <motion.circle
                cx="22" cy="22" r="18" fill="none" stroke="rgb(var(--violet))" strokeWidth="5" strokeLinecap="round"
                pathLength={1} strokeDasharray="1 1"
                initial={{ strokeDashoffset: 1 }}
                whileInView={{ strokeDashoffset: 0.65 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-dark-900">Reserva de emergência: 35%</p>
              <p className="text-dark-500">Quanto guardar por mês para chegar lá.</p>
            </div>
          </div>
        </Tile>
      </RevealGroup>
    </section>
  );
}
