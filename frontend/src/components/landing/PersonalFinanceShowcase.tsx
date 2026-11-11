import { motion } from 'motion/react';
import { Home, ShoppingCart, Car, Utensils } from 'lucide-react';
import { Reveal } from '../motion';
import { EXPENSE_COLOR } from '../charts';
import { SectionHeading } from './SectionHeading';

const MONTHS = [
  { m: 'jun', income: 64, expense: 46 },
  { m: 'jul', income: 64, expense: 58 },
  { m: 'ago', income: 70, expense: 49 },
  { m: 'set', income: 70, expense: 62 },
  { m: 'out', income: 74, expense: 51 },
  { m: 'nov', income: 74, expense: 41 },
];

const CATEGORIES = [
  { icon: Home, label: 'Moradia', share: 38 },
  { icon: ShoppingCart, label: 'Mercado', share: 24 },
  { icon: Car, label: 'Transporte', share: 14 },
  { icon: Utensils, label: 'Restaurantes', share: 11 },
];

export function PersonalFinanceShowcase() {
  return (
    <section id="financas" className="relative scroll-mt-28 overflow-hidden border-y border-dark-200/50 bg-surface/50 py-28">
      <div className="absolute -left-40 top-1/3 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal variant="left" duration={0.9} className="order-2 lg:order-1">
          <div className="grid gap-3 sm:grid-cols-[1.25fr_1fr]" role="img" aria-label="Ilustração de receitas, despesas e categorias de gastos">
            <div className="panel-raised p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-dark-800">Receitas e despesas</p>
                <span className="chip-planned">Ilustração</span>
              </div>
              <div className="mt-6 flex h-44 items-end gap-3">
                {MONTHS.map((x, i) => (
                  <div key={x.m} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end justify-center gap-1">
                      <motion.span
                        className="w-2.5 rounded-full bg-gradient-to-t from-primary-500/40 to-primary-500"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${x.income}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <motion.span
                        className="w-2.5 rounded-full"
                        style={{ background: EXPENSE_COLOR }}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${x.expense}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.28 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="text-[11px] text-dark-500">{x.m}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-5 text-xs text-dark-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-500" />Receitas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: EXPENSE_COLOR }} />Despesas</span>
              </div>
            </div>
            <div className="panel p-5">
              <p className="text-sm font-medium text-dark-800">Gastos por categoria</p>
              <ul className="mt-4 space-y-4">
                {CATEGORIES.map(({ icon: Icon, label, share }, i) => (
                  <li key={label}>
                    <div className="flex items-center gap-2.5 text-sm">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-dark-100 text-dark-600"><Icon className="h-3.5 w-3.5" /></span>
                      <span className="text-dark-700">{label}</span>
                      <span className="ml-auto text-dark-900">{share}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-dark-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-red-500/60 to-red-500"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${share * 2}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHeading eyebrow="Finanças pessoais" title="Para onde vai o dinheiro que não está investido.">
            Saldos, Pix e despesas importados das suas contas pelo Open Finance, com categorias e comparação mês a mês.
            Útil também para quem ainda não investe.
          </SectionHeading>
          <Reveal delay={0.12}>
            <span className="chip-building mt-7">Em desenvolvimento</span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
