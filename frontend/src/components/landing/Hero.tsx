import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, KeyRound, ShieldCheck } from 'lucide-react';
import { SignalRibbon } from '../brand';
import { useAuthStore } from '../../store/authStore';
import { getEntryActions } from './entryActions';
import { HeroPreview } from './HeroPreview';

const PRINCIPLES = [
  { icon: ShieldCheck, text: 'Cada conta acessa somente os próprios dados' },
  { icon: Calculator, text: 'Cálculos transparentes e verificáveis' },
  { icon: KeyRound, text: 'Nenhuma senha bancária armazenada' },
];

export function Hero() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { primary, secondary } = getEntryActions(isAuthenticated);

  return (
    <section className="relative isolate overflow-hidden pt-28 sm:pt-32">
      <div className="absolute inset-0 -z-10 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_60%_30%,black,transparent)]" aria-hidden="true" />
      <div
        className="absolute -top-40 right-[-10%] -z-10 h-[640px] w-[640px] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--primary-500) / 0.18), transparent 65%)' }}
        aria-hidden="true"
      />
      <SignalRibbon className="absolute inset-x-0 bottom-0 -z-10 h-[300px] w-full animate-fade-in opacity-60 [mask-image:linear-gradient(to_right,transparent_30%,black_62%,black_88%,transparent)] sm:h-[380px]" spread={420} />

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pb-16">
        <div className="animate-rise">
          <span className="chip-building">Projeto acadêmico em desenvolvimento</span>
          <h1 className="text-display mt-6 text-[clamp(2.1rem,4.1vw,3.4rem)] leading-[1.08]">
            Seu patrimônio, com leitura clara.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-dark-600">
            Organize carteiras, registre compras e vendas e acompanhe rentabilidade e distribuição em um só painel.
            Contas bancárias, gastos e análises com IA chegam nas próximas versões.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to={primary.to}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary-500 px-6 font-semibold text-dark-50 transition-[background-color,box-shadow] hover:bg-primary-700 hover:shadow-glow"
            >
              {primary.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            {secondary ? (
              <Link to={secondary.to} className="inline-flex h-12 items-center justify-center rounded-control border border-dark-200 bg-dark-100/60 px-6 font-medium text-dark-800 transition-colors hover:border-dark-300 hover:bg-dark-100">
                {secondary.label}
              </Link>
            ) : (
              <a href="#como-funciona" className="inline-flex h-12 items-center justify-center rounded-control border border-dark-200 bg-dark-100/60 px-6 font-medium text-dark-800 transition-colors hover:border-dark-300 hover:bg-dark-100">
                Como funciona
              </a>
            )}
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-dark-600 sm:grid-cols-3 sm:gap-4">
            {PRINCIPLES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}
