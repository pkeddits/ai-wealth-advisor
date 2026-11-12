import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { Horizon, Logo } from '../brand';

const MODULES = [
  { label: 'Carteiras, posições e operações', status: 'Disponível na demonstração', className: 'chip-live' },
  { label: 'Receitas e despesas', status: 'Disponível', className: 'chip-live' },
  { label: 'Contas pelo Open Finance', status: 'Planejado', className: 'chip-planned' },
  { label: 'Explicações com IA', status: 'Planejado', className: 'chip-planned' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthPanel() {
  return (
    <aside className="relative isolate hidden flex-col overflow-hidden border-r border-dark-200/60 p-12 lg:flex">
      <div className="absolute inset-0 -z-20 bg-grid opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden="true" />
      <Horizon className="absolute inset-x-0 top-[62%] -z-10 h-[900px]" intensity="soft" />

      <Link to="/" aria-label="Voltar ao início" className="self-start">
        <Logo />
      </Link>

      <div className="mt-auto">
        <motion.h2
          className="text-display max-w-md text-[2.6rem] leading-[1.02]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
        >
          Patrimônio, carteiras e operações em um só lugar.
        </motion.h2>

        <div className="relative mt-10 h-36 max-w-md" role="img" aria-label="Ilustração com valores fictícios">
          <motion.div
            className="panel-raised absolute left-0 top-0 w-64 !rounded-2xl p-4"
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
          >
            <p className="text-xs text-dark-500">Patrimônio total</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-dark-900">R$ 48.215<span className="text-dark-500">,40</span></p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-green-600"><ArrowUpRight className="h-3.5 w-3.5" />5,2% em 30 dias</p>
          </motion.div>
          <motion.div
            className="panel absolute left-48 top-14 w-52 !rounded-2xl p-4"
            initial={{ opacity: 0, y: 24, rotate: 3 }}
            animate={{ opacity: 1, y: 0, rotate: 3 }}
            transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
          >
            <p className="text-xs text-dark-500">Distribuição</p>
            <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
              {[46, 28, 17, 9].map((w, i) => (
                <span key={i} className="h-full rounded-full" style={{ width: `${w}%`, background: ['rgb(var(--violet))', 'rgb(var(--azure))', 'rgb(var(--accent-500))', 'rgb(var(--primary-800))'][i] }} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-dark-500">Ilustração</p>
          </motion.div>
        </div>

        <ul className="mt-10 max-w-md space-y-2">
          {MODULES.map((m, i) => (
            <motion.li
              key={m.label}
              className="flex items-center justify-between gap-4 rounded-2xl border border-dark-200/60 bg-dark-50/60 px-4 py-3 backdrop-blur"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.08, ease: EASE }}
            >
              <span className="text-sm text-dark-700">{m.label}</span>
              <span className={m.className}>{m.status}</span>
            </motion.li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-dark-500">Projeto acadêmico. Não oferece recomendação de investimento.</p>
      </div>
    </aside>
  );
}

export function AuthMobileHeader() {
  return (
    <div className="relative isolate overflow-hidden px-5 py-5 lg:hidden">
      <div className="absolute inset-x-0 -top-24 -z-10 mx-auto h-48 w-[120%] rounded-[50%] bg-primary-500/25 blur-3xl" aria-hidden="true" />
      <Link to="/" aria-label="Voltar ao início">
        <Logo size="sm" />
      </Link>
    </div>
  );
}
