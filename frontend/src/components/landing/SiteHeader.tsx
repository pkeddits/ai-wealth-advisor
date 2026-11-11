import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '../brand';
import { useAuthStore } from '../../store/authStore';
import { getEntryActions } from './entryActions';

const NAV = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#sobre', label: 'Sobre o projeto' },
];

export function SiteHeader() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { primary, secondary } = getEntryActions(isAuthenticated);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open ? 'border-b border-dark-200/70 bg-dark-50/80 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="AI Wealth Advisor, início">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Seções">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-sm text-dark-600 transition-colors hover:text-dark-900">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {secondary && (
            <Link to={secondary.to} className="rounded-control px-4 py-2 text-sm font-medium text-dark-700 transition-colors hover:text-dark-900">
              {secondary.label}
            </Link>
          )}
          <Link
            to={primary.to}
            className="rounded-control bg-primary-500 px-4 py-2 text-sm font-semibold text-dark-50 transition-[background-color,box-shadow] hover:bg-primary-700 hover:shadow-glow"
          >
            {primary.label}
          </Link>
        </div>

        <button
          type="button"
          className="-mr-2 rounded-control p-2 text-dark-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="site-menu" className="border-t border-dark-200/70 px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Seções">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="border-b border-dark-200/60 py-3 text-dark-700">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-2">
            <Link to={primary.to} className="rounded-control bg-primary-500 py-3 text-center font-semibold text-dark-50">
              {primary.label}
            </Link>
            {secondary && (
              <Link to={secondary.to} className="rounded-control border border-dark-200 py-3 text-center font-medium text-dark-800">
                {secondary.label}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
