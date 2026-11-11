import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Reveal } from '../motion';
import { SectionHeading } from './SectionHeading';

const STEPS = [
  { title: 'Crie sua conta', text: 'Cadastro com e-mail e senha. Seus dados ficam vinculados somente à sua conta.' },
  { title: 'Organize suas informações', text: 'Crie carteiras e registre operações. A conexão com bancos chega com o Open Finance.' },
  { title: 'Acompanhe e entenda', text: 'Patrimônio, resultado e distribuição sempre atualizados. As explicações com IA virão depois.' },
];

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="como-funciona" className="relative mx-auto max-w-7xl scroll-mt-28 px-5 py-28 sm:px-8">
      <SectionHeading eyebrow="Como funciona" title="Três passos até a primeira leitura do seu patrimônio." />
      <ol ref={ref} className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
        <span className="absolute left-5 top-5 hidden h-px w-[calc(100%-40px)] bg-dark-200 md:block" aria-hidden="true" />
        <motion.span
          className="absolute left-5 top-5 hidden h-px w-[calc(100%-40px)] origin-left bg-gradient-to-r from-indigo-400 via-primary-500 to-blue-400 shadow-[0_0_12px_rgb(var(--violet))] md:block"
          style={{ scaleX: progress, background: 'var(--gradient-brand)' }}
          aria-hidden="true"
        />
        {STEPS.map((step, i) => (
          <Reveal key={step.title} as="li" delay={i * 0.12} className="relative">
            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary-500/50 bg-dark-50 font-display text-sm font-semibold text-primary-700 shadow-[0_0_0_6px_rgb(var(--dark-50))]">
              {i + 1}
            </span>
            <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 max-w-sm text-dark-600">{step.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
