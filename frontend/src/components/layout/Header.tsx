import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { isApiMode } from '../../config/appMode';
import { pageTitle } from './navigation';

const todayRaw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

export function Header() {
  const { user, logout } = useAuthStore();
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="flex h-14 items-center justify-between gap-4 rounded-2xl border border-dark-200/50 bg-dark-50/70 px-3 backdrop-blur-xl sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMobileNav}
            className="-ml-1 rounded-lg p-2 text-dark-600 hover:bg-dark-100 hover:text-dark-900 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm text-dark-500">
            <span className="hidden sm:inline">Wealth Advisor</span>
            <span className="mx-2 hidden text-dark-300 sm:inline">/</span>
            <span className="font-medium text-dark-900">{pageTitle(location.pathname)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-xl border border-dark-200/70 px-3 py-1.5 text-xs text-dark-500 md:inline-flex">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {today}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-dark-100"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-dark-100 text-primary-700">
                <User className="h-4 w-4" />
              </span>
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-dark-800 md:block">{user?.name}</span>
              <ChevronDown className={`h-4 w-4 text-dark-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  role="menu"
                  className="panel-raised absolute right-0 mt-2 w-60 origin-top-right overflow-hidden !rounded-2xl p-1.5"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="border-b border-dark-200/70 px-3 pb-2.5 pt-2">
                    <p className="truncate text-sm font-medium text-dark-900">{user?.name}</p>
                    <p className="truncate text-xs text-dark-500">{user?.email}</p>
                  </div>
                  {isApiMode && (
                    <NavLink to="/settings" role="menuitem" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-dark-700 hover:bg-dark-100">
                      <User className="h-4 w-4" /> Perfil
                    </NavLink>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
