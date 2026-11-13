import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowLeftRight, Car, Home, RefreshCw, ShoppingCart, Utensils } from 'lucide-react';
import { Reveal, ScrollParallax, usePointerParallax } from '../motion';
import { EXPENSE_COLOR, SERIES_COLORS } from '../charts';
import { SectionHeading } from './SectionHeading';
import { FloatCard } from './FloatCard';

const EASE = [0.22, 1, 0.36, 1] as const;

const WEEKS = [
  { label: 'sem 1', income: 82, expense: 54 },
  { label: 'sem 2', income: 12, expense: 38 },
  { label: 'sem 3', income: 18, expense: 61 },
  { label: 'sem 4', income: 9, expense: 33 },
];

const CATEGORIES = [
  { icon: Home, label: 'Moradia', share: 41 },
  { icon: ShoppingCart, label: 'Mercado', share: 23 },
  { icon: Car, label: 'Transporte', share: 15 },
  { icon: Utensils, label: 'Restaurantes', share: 12 },
];

function Donut() {
  const r = 34;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 90 90" className="h-24 w-24 -rotate-90" aria-hidden="true">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgb(var(--dark-100))" strokeWidth="10" />
      {CATEGORIES.map((c, i) => {
        const len = (c.share / 100) * circ;
        const dash = (
          <motion.circle
            key={c.label}
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke={SERIES_COLORS[i]}
            strokeWidth="10"
            strokeDashoffset={-offset}
            initial={{ strokeDasharray: `0 ${circ}` }}
            whileInView={{ strokeDasharray: `${len - 1.5} ${circ - len + 1.5}` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.5 + i * 0.12, ease: EASE }}
          />
        );
        offset += len;
        return dash;
      })}
    </svg>
  );
}

export function PersonalFinanceShowcase() {
  const { x, y, enabled } = usePointerParallax();

  return (
    <section id="financas" className="relative scroll-mt-28 overflow-hidden border-y border-dark-200/50 bg-surface/50 py-28">
      <div className="fx-decor absolute -left-40 top-1/4 -z-10 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[110px]" aria-hidden="true" />
      <div className="fx-decor absolute -right-32 bottom-0 -z-10 h-[380px] w-[380px] rounded-full bg-blue-500/10 blur-[110px]" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <ScrollParallax distance={30} className="order-2 lg:order-1">
          <Reveal variant="scale" duration={1}>
            <div className="relative mx-auto max-w-[560px] py-10" role="img" aria-label="Ilustração de um painel de gastos com valores fictícios">
              <div className="panel-glass relative !rounded-[28px] p-6 shadow-[0_40px_90px_-40px_rgb(var(--indigo)/0.65)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-dark-500">Saldo de novembro</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-dark-900">R$ 1.842<span className="text-dark-500">,60</span></p>
                    <p className="mt-1 text-xs text-dark-500">Receitas menos despesas do mês</p>
                  </div>
                  <span className="chip-planned">Ilustração</span>
                </div>

                <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-6">
                  <div className="flex h-36 items-end gap-4">
                    {WEEKS.map((w, i) => (
                      <div key={w.label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-28 w-full items-end justify-center gap-1.5">
                          <motion.span
                            className="w-3 rounded-full bg-gradient-to-t from-primary-500/30 to-primary-500"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${w.income}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: EASE }}
                          />
                          <motion.span
                            className="w-3 rounded-full"
                            style={{ background: EXPENSE_COLOR }}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${w.expense}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, delay: 0.38 + i * 0.08, ease: EASE }}
                          />
                        </div>
                        <span className="text-[11px] text-dark-500">{w.label}</span>
                      </div>
                    ))}
                  </div>
                  <Donut />
                </div>

                <ul className="mt-6 grid grid-cols-2 gap-2">
                  {CATEGORIES.map(({ icon: Icon, label, share }, i) => (
                    <motion.li
                      key={label}
                      className="flex items-center gap-2.5 rounded-xl border border-dark-200/60 bg-dark-50/40 px-3 py-2 text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.7 + i * 0.07, ease: EASE }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[i] }} />
                      <Icon className="h-3.5 w-3.5 text-dark-500" />
                      <span className="text-dark-700">{label}</span>
                      <span className="ml-auto text-dark-900">{share}%</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <FloatCard className="-left-4 top-0 hidden sm:block lg:-left-12" pointerX={x} pointerY={y} depth={22} delay={0.6} floatPeriod={8} rich={enabled}>
                <div className="panel-glass flex items-center gap-3 !rounded-2xl p-3 pr-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/15 text-green-600"><ArrowDownLeft className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-medium text-dark-900">Pix recebido</p>
                    <p className="text-xs text-green-600">+R$ 350,00</p>
                  </div>
                </div>
              </FloatCard>

              <FloatCard className="-bottom-12 right-0 hidden sm:block lg:-right-10" pointerX={x} pointerY={y} depth={32} delay={0.8} floatPeriod={9.5} rich={enabled}>
                <div className="panel-glass w-60 !rounded-2xl p-3.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-dark-900"><ArrowLeftRight className="h-4 w-4 text-primary-700" />Entre suas contas</p>
                  <p className="mt-1 text-xs text-dark-500">Transferência de R$ 1.000,00 identificada e mantida fora dos gastos.</p>
                </div>
              </FloatCard>

              <FloatCard className="-bottom-2 left-8 hidden sm:block" pointerX={x} pointerY={y} depth={26} delay={1} floatPeriod={10.5} rich={enabled}>
                <div className="panel-glass flex items-center gap-2.5 !rounded-full py-2 pl-2 pr-4 text-sm text-dark-700">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/15 text-primary-700"><RefreshCw className="h-3.5 w-3.5" /></span>
                  Conta sincronizada há 2 min
                </div>
              </FloatCard>
            </div>
          </Reveal>
        </ScrollParallax>

        <div className="order-1 lg:order-2">
          <SectionHeading eyebrow="Finanças pessoais" title="Todas as contas em um só lugar, organizadas sozinhas.">
            Receitas e despesas por categoria, saldo de cada mês e a origem de cada movimentação. Com o Open Finance, os
            lançamentos chegam das suas contas com a sua autorização; transferências entre contas próprias, aplicações e
            faturas não são contadas como gasto.
          </SectionHeading>
          <Reveal delay={0.12}>
            <span className="mt-7 flex flex-wrap gap-2">
              <span className="chip-live">Lançamentos manuais disponíveis</span>
              <span className="chip-live">Open Finance com o Pluggy Bank · bancos reais em liberação</span>
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
