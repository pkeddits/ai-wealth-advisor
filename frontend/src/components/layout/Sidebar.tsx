import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { appMode } from '../../config/appMode';
import { riskProfileLabel } from '../../utils/labels';
import { Logo, LogoMark } from '../brand';
import { NAV_SECTIONS } from './navigation';
import { Avatar } from '../common/Avatar';
import { useSignOut } from '../../hooks/useSignOut';

function NavContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className={clsx('flex h-16 items-center gap-2 px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <NavLink to="/dashboard" aria-label="Ir para o painel" onClick={onNavigate}>
          {collapsed ? <LogoMark className="h-9 w-9" /> : <Logo size="sm" />}
        </NavLink>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden rounded-lg p-1.5 text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-800 lg:block"
            aria-label="Recolher menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Navegação principal" onMouseLeave={() => setHovered(null)}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mt-4 first:mt-1">
            {!collapsed && <p className="px-3 pb-2 text-[11px] font-medium text-dark-500">{section.title}</p>}
            {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-dark-200" aria-hidden="true" />}
            <ul className="space-y-1" role="list">
              {section.items.map((item) => {
                const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                const available = item.availableIn.includes(appMode);
                return (
                  <li key={item.href} onMouseEnter={() => setHovered(item.href)}>
                    <NavLink
                      to={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        active ? 'text-dark-900' : 'text-dark-600 hover:text-dark-900',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl border border-primary-500/30 bg-gradient-to-r from-primary-500/20 via-primary-500/[0.08] to-transparent"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        >
                          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-500 shadow-[0_0_12px_rgb(var(--violet))]" />
                        </motion.span>
                      )}
                      {!active && hovered === item.href && (
                        <motion.span
                          layoutId={collapsed ? 'nav-hover-collapsed' : 'nav-hover'}
                          className="absolute inset-0 rounded-xl bg-dark-100/80"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          aria-hidden="true"
                        />
                      )}
                      <item.icon
                        className={clsx(
                          'relative h-[18px] w-[18px] shrink-0 transition-[color,transform] duration-300 group-hover:scale-110 group-active:scale-95',
                          active ? 'text-primary-700 drop-shadow-[0_0_8px_rgb(var(--violet)/0.7)]' : 'text-dark-500 group-hover:text-dark-700',
                        )}
                        aria-hidden="true"
                      />
                      {!collapsed && <span className="relative">{item.name}</span>}
                      {!collapsed && !available && (
                        <span className="relative ml-auto rounded-full border border-dark-200 px-2 py-0.5 text-[10px] font-medium text-dark-500">Com conta</span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3">
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="mb-2 hidden w-full justify-center rounded-xl p-2 text-dark-500 hover:bg-dark-100 hover:text-dark-800 lg:flex"
            aria-label="Expandir menu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <div className={clsx('flex items-center gap-3 rounded-2xl border border-dark-200/70 bg-dark-100/50 p-2.5', collapsed && 'flex-col')}>
          <NavLink to="/settings" onClick={onNavigate} aria-label="Abrir configurações" className="rounded-xl transition-transform hover:scale-105">
            <Avatar name={user?.name} />
          </NavLink>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-dark-900">{user?.name}</p>
              <p className="truncate text-xs text-dark-500">{riskProfileLabel(user?.riskProfile)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-dark-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const { isMobileNavOpen, closeMobileNav, isSidebarCollapsed } = useUIStore();

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  return (
    <>
      <motion.aside
        className="panel fixed inset-y-3 left-3 z-40 hidden overflow-hidden !rounded-[28px] lg:block"
        animate={{ width: isSidebarCollapsed ? 84 : 256 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        aria-label="Menu lateral"
      >
        <NavContent collapsed={isSidebarCollapsed} />
      </motion.aside>

      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[3px] lg:hidden"
              onClick={closeMobileNav}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            />
            <motion.aside
              className="panel fixed inset-y-3 left-3 z-50 w-[272px] max-w-[calc(100vw-24px)] overflow-hidden !rounded-[28px] lg:hidden"
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              exit={{ x: '-110%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              aria-label="Menu lateral"
            >
              <NavContent collapsed={false} onNavigate={closeMobileNav} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
