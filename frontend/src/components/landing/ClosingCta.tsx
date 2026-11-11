import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Horizon } from '../brand';
import { Reveal } from '../motion';
import { useAuthStore } from '../../store/authStore';
import { getEntryActions } from './entryActions';

export function ClosingCta() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { primary } = getEntryActions(isAuthenticated);

  return (
    <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
      <Reveal variant="clip" duration={1.1}>
        <div className="panel-feature relative isolate overflow-hidden px-6 pb-40 pt-20 text-center sm:px-12">
          <Horizon className="absolute inset-x-0 top-[58%] -z-10 h-[700px]" intensity="soft" />
          <h2 className="text-display mx-auto max-w-3xl text-[clamp(2.1rem,5vw,4rem)] leading-[1.02]">Comece pela sua primeira carteira.</h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-dark-600">Em poucos minutos o patrimônio já toma forma no painel.</p>
          <Link
            to={primary.to}
            className="group relative mt-10 inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-2xl bg-brand px-8 font-semibold text-dark-900 shadow-[0_18px_40px_-14px_rgb(var(--violet)/0.8)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5"
          >
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]" aria-hidden="true" />
            {primary.label}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
