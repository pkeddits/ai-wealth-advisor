import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SignalRibbon } from '../brand';
import { useAuthStore } from '../../store/authStore';
import { getEntryActions } from './entryActions';

export function ClosingCta() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { primary } = getEntryActions(isAuthenticated);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="panel-raised relative isolate overflow-hidden px-6 py-16 text-center sm:px-12">
        <SignalRibbon className="absolute inset-x-0 top-1/2 -z-10 h-64 w-full -translate-y-1/2 opacity-40" lines={18} amplitude={60} />
        <h2 className="text-display mx-auto max-w-2xl text-3xl sm:text-4xl">Comece pela sua primeira carteira.</h2>
        <p className="mx-auto mt-4 max-w-lg text-dark-600">Leva poucos minutos e você já vê o patrimônio tomar forma.</p>
        <Link
          to={primary.to}
          className="group mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary-500 px-7 font-semibold text-dark-50 transition-[background-color,box-shadow] hover:bg-primary-700 hover:shadow-glow"
        >
          {primary.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
