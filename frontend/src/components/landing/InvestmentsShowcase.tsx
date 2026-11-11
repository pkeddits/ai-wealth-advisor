import { motion } from 'motion/react';
import { Ban, Check } from 'lucide-react';
import { Reveal, ScrollParallax } from '../motion';
import { SERIES_COLORS } from '../charts';
import { SectionHeading } from './SectionHeading';

const POSITIONS = [
  { symbol: 'ITUB4', cls: 'Ações', qty: '100', avg: 'R$ 31,20', value: 'R$ 3.450,00', gain: '+10,6%', share: 38 },
  { symbol: 'MXRF11', cls: 'FIIs', qty: '300', avg: 'R$ 9,60', value: 'R$ 2.955,00', gain: '+2,6%', share: 33 },
  { symbol: 'BOVA11', cls: 'ETFs', qty: '20', avg: 'R$ 124,10', value: 'R$ 2.572,00', gain: '+3,6%', share: 29 },
];

const POINTS = [
  'Preço médio e custo recalculados a cada compra',
  'Ganho não realizado e participação de cada ativo',
  'Distribuição por classe: ações, FIIs, ETFs, renda fixa',
  'Vendas acima da quantidade em carteira são recusadas',
];

export function InvestmentsShowcase() {
  return (
    <section id="investimentos" className="relative mx-auto max-w-7xl scroll-mt-28 px-5 py-28 sm:px-8">
      <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading eyebrow="Investimentos" title="Cada operação muda o retrato da carteira, na hora.">
            Registre compras e vendas e veja posições, preço médio e distribuição recalculados por cálculos determinísticos e verificáveis.
          </SectionHeading>
          <Reveal delay={0.1}>
            <span className="chip-live mt-7">Disponível na demonstração</span>
          </Reveal>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((point, i) => (
              <Reveal key={point} variant="left" delay={0.1 + i * 0.07} as="li">
                <span className="flex items-start gap-3 text-dark-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-primary-700">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {point}
                </span>
              </Reveal>
            ))}
          </ul>
        </div>

        <ScrollParallax distance={36}><Reveal variant="right" duration={0.9} className="relative">
          <div className="absolute -inset-10 -z-10 rounded-[40px] bg-primary-500/10 blur-3xl" aria-hidden="true" />
          <div className="panel-raised overflow-hidden p-6" role="img" aria-label="Ilustração de uma carteira com três posições">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-dark-500">Carteira</p>
                <p className="font-display text-xl font-semibold tracking-tight text-dark-900">Aposentadoria</p>
              </div>
              <span className="chip-planned">Ilustração</span>
            </div>

            <div className="mt-6 flex h-3 gap-1 overflow-hidden rounded-full">
              {POSITIONS.map((p, i) => (
                <motion.span
                  key={p.symbol}
                  className="h-full rounded-full"
                  style={{ background: SERIES_COLORS[i] }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${p.share}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-500">
                    <th className="pb-3 font-medium">Ativo</th>
                    <th className="pb-3 font-medium">Qtd.</th>
                    <th className="pb-3 font-medium">Preço médio</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                    <th className="pb-3 text-right font-medium">Ganho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200/60">
                  {POSITIONS.map((p, i) => (
                    <motion.tr
                      key={p.symbol}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.45 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className="transition-colors hover:bg-dark-100/40"
                    >
                      <td className="py-3.5">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[i] }} aria-hidden="true" />
                          <span className="font-medium text-dark-900">{p.symbol}</span>
                          <span className="text-xs text-dark-500">{p.cls}</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-dark-700">{p.qty}</td>
                      <td className="py-3.5 text-dark-700">{p.avg}</td>
                      <td className="py-3.5 text-right text-dark-900">{p.value}</td>
                      <td className="py-3.5 text-right text-green-600">{p.gain}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <motion.div
            className="panel-glass absolute -bottom-14 right-4 flex max-w-[300px] items-center gap-3 !border-red-500/25 p-3.5 sm:-right-6"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600">
              <Ban className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-snug text-dark-700">Venda de 500 MXRF11 recusada: 300 disponíveis.</p>
          </motion.div>
        </Reveal></ScrollParallax>
      </div>
    </section>
  );
}
