import { Link } from 'react-router-dom';
import { Logo, SignalRibbon } from '../brand';

const MODULES = [
  { label: 'Carteiras, posições e operações', status: 'Disponível na demonstração', className: 'chip-live' },
  { label: 'Contas, gastos e Open Finance', status: 'Em desenvolvimento', className: 'chip-building' },
  { label: 'Explicações com IA', status: 'Planejado', className: 'chip-planned' },
];

export function AuthPanel() {
  return (
    <aside className="relative isolate hidden flex-col justify-between overflow-hidden border-r border-dark-200/70 bg-white/40 p-12 lg:flex">
      <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" aria-hidden="true" />
      <SignalRibbon className="absolute inset-x-0 top-[44%] -z-10 h-80 w-full opacity-60" lines={24} amplitude={70} />

      <Link to="/" aria-label="Voltar ao início" className="self-start">
        <Logo />
      </Link>

      <div>
        <h2 className="text-display max-w-md text-[2.1rem] leading-[1.12]">Patrimônio, carteiras e operações em um só lugar.</h2>
        <ul className="mt-10 max-w-md space-y-3">
          {MODULES.map((m) => (
            <li key={m.label} className="flex items-center justify-between gap-4 rounded-2xl border border-dark-200/70 bg-dark-50/70 px-4 py-3 backdrop-blur">
              <span className="text-sm text-dark-700">{m.label}</span>
              <span className={`${m.className} shrink-0`}>{m.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-dark-500">Projeto acadêmico. Não oferece recomendação de investimento.</p>
    </aside>
  );
}

export function AuthMobileHeader() {
  return (
    <div className="relative isolate overflow-hidden border-b border-dark-200/70 px-5 py-4 lg:hidden">
      <SignalRibbon className="absolute inset-0 -z-10 h-full w-full opacity-40" lines={14} amplitude={40} />
      <Link to="/" aria-label="Voltar ao início">
        <Logo size="sm" />
      </Link>
    </div>
  );
}
