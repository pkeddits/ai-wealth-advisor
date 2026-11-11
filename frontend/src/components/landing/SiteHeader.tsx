import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '../brand';
import { useAuthStore } from '../../store/authStore';
import { getEntryActions } from './entryActions';

const NAV = [
  { href: '#investimentos', label: 'Investimentos' },
  { href: '#financas', label: 'Finanças pessoais' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
];

export function SiteHeader() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { primary, secondary } = getEntryActions(isAuthenticated);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={clsx(
          'mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl px-3 transition-[background-color,border-color,box-shadow] duration-500 sm:px-4',
          scrolled || open ? 'border border-dark-200/60 bg-dark-50/75 shadow-float backdrop-blur-xl' : 'border border-transparent',
        )}
      >
        <Link to="/" aria-label="Wealth Advisor AI, início" className="px-1">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-dark-200/60 bg-dark-100/30 p-1 backdrop-blur lg:flex" aria-label="Seções">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="rounded-full px-4 py-1.5 text-sm text-dark-600 transition-colors hover:bg-dark-100 hover:text-dark-900">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {secondary && (
            <Link to={secondary.to} className="link-underline px-3 py-2 text-sm font-medium text-dark-700 hover:text-dark-900">
              {secondary.label}
            </Link>
          )}
          <Link
            to={primary.to}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-[0_10px_24px_-10px_rgb(var(--violet)/0.8)] transition-[box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-glow"
          >
            {primary.label}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-dark-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            className="panel-raised mx-auto mt-2 max-w-7xl !rounded-2xl p-4 md:hidden"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <nav className="flex flex-col" aria-label="Seções">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-dark-700 hover:bg-dark-100">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              <Link to={primary.to} className="rounded-xl bg-brand py-3 text-center font-semibold text-on-brand">
                {primary.label}
              </Link>
              {secondary && (
                <Link to={secondary.to} className="rounded-xl border border-dark-200 py-3 text-center font-medium text-dark-800">
                  {secondary.label}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
