import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Bell, Landmark, LineChart, ShieldCheck, Sparkles, Target, UtensilsCrossed } from 'lucide-react';
import { Horizon, Logo } from '../brand';
import { FloatCard } from '../landing/FloatCard';
import { usePointerParallax, useRichMotion } from '../motion';

const EASE = [0.22, 1, 0.36, 1] as const;
const SPARK = [18, 22, 20, 27, 25, 31, 29, 36, 34, 41];

function Sparkline({ rich }: { rich: boolean }) {
  const max = Math.max(...SPARK);
  const pts = SPARK.map((v, i) => `${(i / (SPARK.length - 1)) * 100},${40 - (v / max) * 34}`).join(' ');
  return (
    <svg viewBox="0 0 100 42" className="mt-3 h-10 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="auth-spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgb(var(--violet))" stopOpacity="0.45" /><stop offset="100%" stopColor="rgb(var(--violet))" stopOpacity="0" /></linearGradient>
      </defs>
      <motion.polygon points={`0,42 ${pts} 100,42`} fill="url(#auth-spark)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }} />
      <motion.polyline points={pts} fill="none" stroke="rgb(var(--violet))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: rich ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 1.4, ease: EASE }} />
    </svg>
  );
}

const FEATURES = [
  { icon: LineChart, text: 'Carteiras com preço médio, cotações e resultado' },
  { icon: Landmark, text: 'Open Finance para importar contas e investimentos' },
  { icon: Sparkles, text: 'Assistente que explica seus números em segundos' },
];

export function AuthPanel() {
  const { x, y } = usePointerParallax();
  const rich = useRichMotion();
  return (
    <aside className="relative isolate hidden flex-col overflow-hidden border-r border-dark-200/60 p-12 lg:flex">
      <div className="absolute inset-0 -z-20 bg-grid opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden="true" />
      <Horizon className="absolute inset-x-0 top-[62%] -z-10 h-[900px]" intensity="soft" />
      <div className="ambient-orb absolute -left-32 top-10 -z-10 h-[440px] w-[440px] text-primary-500/30" aria-hidden="true" />
      <div className="ambient-orb absolute -right-28 bottom-24 -z-10 h-[400px] w-[400px] text-blue-500/25" style={{ animationDelay: '-10s' }} aria-hidden="true" />

      <Link to="/" aria-label="Voltar ao início" className="self-start"><Logo /></Link>

      <div className="relative mt-10 flex-1" role="img" aria-label="Ilustração do produto com valores fictícios">
        <FloatCard className="left-0 top-[4%]" pointerX={x} pointerY={y} depth={14} delay={0.2} floatPeriod={8} rich={rich}>
          <div className="panel-raised w-72 !rounded-2xl p-4">
            <p className="text-xs text-dark-500">Patrimônio total</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-dark-900">R$ 48.215<span className="text-dark-500">,40</span></p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-green-600"><ArrowUpRight className="h-3.5 w-3.5" />5,2% em 30 dias</p>
            <Sparkline rich={rich} />
          </div>
        </FloatCard>
        <FloatCard className="right-[2%] top-[0%]" pointerX={x} pointerY={y} depth={26} delay={0.45} floatPeriod={9.5} rich={rich}>
          <div className="panel-glass w-56 !border-accent-500/30 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-accent-400"><Sparkles className="h-3.5 w-3.5" />Assistente</p>
            <p className="mt-2 text-sm leading-snug text-dark-700">Você gastou 12% menos com transporte que no mês passado.</p>
          </div>
        </FloatCard>
        <FloatCard className="left-[30%] top-[40%]" pointerX={x} pointerY={y} depth={34} delay={0.65} floatPeriod={7.4} rich={rich}>
          <div className="panel-glass w-60 p-4">
            <p className="flex items-center gap-1.5 text-xs text-dark-500"><UtensilsCrossed className="h-3.5 w-3.5" />Alimentação</p>
            <div className="mt-2 flex items-baseline justify-between"><span className="text-lg font-semibold text-dark-900">R$ 432,80</span><span className="text-xs text-dark-500">de R$ 600</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-100"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ delay: 1, duration: 1.2, ease: EASE }} /></div>
          </div>
        </FloatCard>
        <FloatCard className="left-[2%] top-[58%]" pointerX={x} pointerY={y} depth={20} delay={0.85} floatPeriod={8.6} rich={rich}>
          <div className="panel-glass flex w-52 items-center gap-3 p-4">
            <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90" aria-hidden="true">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgb(var(--dark-200))" strokeWidth="5" />
              <motion.circle cx="20" cy="20" r="16" fill="none" stroke="rgb(var(--azure))" strokeWidth="5" strokeLinecap="round" initial={{ strokeDasharray: '0 101' }} animate={{ strokeDasharray: '58 101' }} transition={{ delay: 1.2, duration: 1.3, ease: EASE }} />
            </svg>
            <div><p className="flex items-center gap-1 text-xs text-dark-500"><Target className="h-3.5 w-3.5" />Viagem</p><p className="text-sm font-semibold text-dark-900">58% da meta</p></div>
          </div>
        </FloatCard>
        <FloatCard className="right-[4%] top-[62%]" pointerX={x} pointerY={y} depth={42} delay={1.05} floatPeriod={10} rich={rich}>
          <div className="panel-glass w-56 p-4">
            <p className="flex items-center gap-1.5 text-xs text-dark-500"><Landmark className="h-3.5 w-3.5" />Conta conectada</p>
            <p className="mt-1 text-sm text-dark-900">8 movimentações novas</p>
            <p className="mt-1 text-[11px] text-green-600">Sincronizada agora</p>
          </div>
        </FloatCard>
        <FloatCard className="left-[46%] top-[18%]" pointerX={x} pointerY={y} depth={52} delay={1.25} floatPeriod={6.8} rich={rich}>
          <div className="panel-glass flex items-center gap-2 !rounded-full px-3 py-2 text-xs text-dark-700"><Bell className="h-3.5 w-3.5 text-yellow-600" />Orçamento de lazer em 85%</div>
        </FloatCard>
      </div>

      <div>
        <motion.h2 className="text-display max-w-md text-[2.5rem] leading-[1.03]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease: EASE }}>
          Seu dinheiro, organizado e explicado.
        </motion.h2>
        <ul className="mt-6 max-w-md space-y-2.5">
          {FEATURES.map((f, i) => (
            <motion.li key={f.text} className="flex items-center gap-3 text-sm text-dark-700" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: EASE }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-dark-200 bg-dark-100 text-primary-700"><f.icon className="h-4 w-4" /></span>{f.text}
            </motion.li>
          ))}
        </ul>
        <p className="mt-8 flex items-center gap-1.5 text-xs text-dark-500"><ShieldCheck className="h-3.5 w-3.5" />Valores ilustrativos. Não oferecemos recomendação de investimento.</p>
      </div>
    </aside>
  );
}

export function AuthMobileHeader() {
  return (
    <div className="relative isolate overflow-hidden px-5 py-5 lg:hidden">
      <div className="absolute inset-x-0 -top-24 -z-10 mx-auto h-48 w-[120%] rounded-[50%] bg-primary-500/25 blur-3xl" aria-hidden="true" />
      <Link to="/" aria-label="Voltar ao início"><Logo size="sm" /></Link>
    </div>
  );
}
