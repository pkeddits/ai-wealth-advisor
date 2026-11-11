import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, BadgeCheck as Validated, Calculator, KeyRound, PieChart, RefreshCw, ShieldCheck } from 'lucide-react';
import { Horizon } from '../brand';
import { usePointerParallax } from '../motion';
import { useAuthStore } from '../../store/authStore';
import { getEntryActions } from './entryActions';
import { HeroStage } from './HeroStage';
import { FloatCard } from './FloatCard';

const EASE = [0.22, 1, 0.36, 1] as const;

const PRINCIPLES = [
  { icon: ShieldCheck, text: 'Cada conta acessa só os próprios dados' },
  { icon: Calculator, text: 'Cálculos transparentes e verificáveis' },
  { icon: KeyRound, text: 'Nenhuma senha bancária armazenada' },
];

function MaskLine({ children, delay, shineDelay }: { children: string; delay: number; shineDelay: number }) {
  const reduced = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span className="text-shine block" style={{ animationDelay: `${shineDelay}s` }} initial={reduced ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1, delay, ease: EASE }}>
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { primary, secondary } = getEntryActions(isAuthenticated);
  const ref = useRef<HTMLElement>(null);
  const { x, y, enabled } = usePointerParallax();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const tilt = useTransform(scrollYProgress, [0, 0.55], enabled ? [16, 0] : [8, 0]);
  const horizonY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const glowX = useTransform(x, (v) => v * 40);

  return (
    <section ref={ref} className="relative isolate overflow-hidden pb-48 pt-32 sm:pt-40">
      <div className="fx-decor absolute inset-0 -z-20 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_45%_at_50%_15%,black,transparent)]" aria-hidden="true" />
      <motion.div
        className="fx-decor absolute left-1/2 top-[-8%] -z-20 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-70"
        style={{ x: glowX, background: 'radial-gradient(closest-side, rgb(var(--indigo) / 0.42), rgb(var(--violet) / 0.14) 55%, transparent)' }}
        aria-hidden="true"
      />
      <Horizon className="fx-decor absolute inset-x-0 top-[44%] -z-10 h-[1100px] sm:top-[40%]" offsetY={horizonY} />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent to-dark-50" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-8">
        <FloatCard className="left-6 top-[30%] hidden xl:block" pointerX={x} pointerY={y} depth={18} delay={1.2} floatPeriod={8} rich={enabled}>
          <span className="panel-glass flex items-center gap-2.5 !rounded-full py-2 pl-2 pr-4 text-sm text-dark-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/15 text-primary-700"><RefreshCw className="h-3.5 w-3.5" /></span>
            Preço médio atualizado
          </span>
        </FloatCard>
        <FloatCard className="left-2 top-[80%] hidden xl:block" pointerX={x} pointerY={y} depth={30} delay={1.4} floatPeriod={9.5} rich={enabled}>
          <span className="panel-glass flex items-center gap-2.5 !rounded-full py-2 pl-2 pr-4 text-sm text-dark-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/15 text-green-600"><Validated className="h-3.5 w-3.5" /></span>
            Venda validada pelo saldo
          </span>
        </FloatCard>
        <FloatCard className="right-8 top-[40%] hidden xl:block" pointerX={x} pointerY={y} depth={24} delay={1.3} floatPeriod={10.5} rich={enabled}>
          <span className="panel-glass flex items-center gap-2.5 !rounded-full py-2 pl-2 pr-4 text-sm text-dark-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15 text-blue-600"><PieChart className="h-3.5 w-3.5" /></span>
            Distribuição recalculada
          </span>
        </FloatCard>
        <motion.span
          className="chip-building"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        >
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary-500" aria-hidden="true" />
          Projeto acadêmico em desenvolvimento
        </motion.span>

        <h1 className="text-display mx-auto mt-7 max-w-5xl text-[clamp(2.7rem,8.2vw,6.6rem)] leading-[0.98]">
          <MaskLine delay={0.2} shineDelay={1.3}>Seu patrimônio</MaskLine>
          <MaskLine delay={0.34} shineDelay={1.5}>em perspectiva.</MaskLine>
        </h1>

        <motion.p
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-dark-600 sm:text-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
        >
          Carteiras, operações, rentabilidade e distribuição em uma leitura só. Contas, gastos e explicações com IA chegam
          nas próximas versões.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75, ease: EASE }}
        >
          <Link
            to={primary.to}
            className="group relative inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-2xl bg-brand px-8 text-base font-semibold text-on-brand shadow-[0_18px_40px_-14px_rgb(var(--violet)/0.8)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-14px_rgb(var(--violet)/0.95)]"
          >
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]" aria-hidden="true" />
            {primary.label}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          {secondary ? (
            <Link to={secondary.to} className="inline-flex h-14 items-center rounded-2xl border border-dark-200 bg-dark-100/40 px-7 font-medium text-dark-800 backdrop-blur transition-colors hover:border-dark-300 hover:bg-dark-100/80">
              {secondary.label}
            </Link>
          ) : (
            <a href="#como-funciona" className="inline-flex h-14 items-center rounded-2xl border border-dark-200 bg-dark-100/40 px-7 font-medium text-dark-800 backdrop-blur transition-colors hover:border-dark-300 hover:bg-dark-100/80">
              Como funciona
            </a>
          )}
        </motion.div>

        <motion.ul
          className="mx-auto mt-9 flex max-w-3xl flex-col items-center justify-center gap-x-7 gap-y-2.5 text-sm text-dark-500 sm:flex-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {PRINCIPLES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 whitespace-nowrap">
              <Icon className="h-4 w-4 text-primary-700" aria-hidden="true" />
              {text}
            </li>
          ))}
        </motion.ul>
      </div>

      <div className="mt-20 px-5 sm:px-8 lg:mt-24">
        <HeroStage pointerX={x} pointerY={y} tilt={tilt} rich={enabled} />
      </div>
    </section>
  );
}
