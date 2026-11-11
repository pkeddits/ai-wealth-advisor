import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Bot,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';
import { appMode, type AppMode } from '../../config/appMode';
import { Logo, LogoMark } from '../brand';

const ALL_MODES: AppMode[] = ['demo', 'supabase', 'api'];

// Modos em que a página tem implementação; nos demais ela mostra "Em desenvolvimento".
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, availableIn: ALL_MODES },
  { name: 'Carteiras', href: '/portfolios', icon: Wallet, availableIn: ['demo', 'api'] as AppMode[] },
  { name: 'Análise IA', href: '/ai-analysis', icon: Bot, availableIn: ['api'] as AppMode[] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, availableIn: ['api'] as AppMode[] },
  { name: 'Simulações', href: '/simulations', icon: TrendingUp, availableIn: ['api'] as AppMode[] },
  { name: 'Alertas', href: '/alerts', icon: AlertTriangle, availableIn: ['api'] as AppMode[] },
  { name: 'Configurações', href: '/settings', icon: Settings, availableIn: ['api'] as AppMode[] },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isMobileNavOpen, closeMobileNav } = useUIStore();

  // No celular o menu fecha ao trocar de página
  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  return (
    <>
    {isMobileNavOpen && (
      <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closeMobileNav} aria-hidden="true" />
    )}
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 h-screen border-r border-dark-200/70 bg-white transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64',
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col">
        <div className={clsx('flex h-16 items-center border-b border-dark-200/70 px-4', isCollapsed && 'justify-center')}>
          <NavLink to="/dashboard" aria-label="Ir para o painel">
            {isCollapsed ? <LogoMark className="h-8 w-8" /> : <Logo size="sm" />}
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto" aria-label="Main navigation">
          <ul className="space-y-1 px-2" role="list">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-500/10 text-primary-700 shadow-[inset_2px_0_0_rgb(var(--primary-500))]'
                        : 'text-dark-600 hover:bg-dark-100 hover:text-dark-900',
                      isCollapsed && 'justify-center'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {!isCollapsed && <span>{item.name}</span>}
                    {!isCollapsed && !item.availableIn.includes(appMode) && (
                      <span className="ml-auto rounded-full bg-dark-100 px-2 py-0.5 text-[11px] font-medium text-dark-500">
                        Em breve
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className={clsx('p-4 border-t border-dark-200', isCollapsed && 'items-center')}>
          {!isCollapsed && user && (
            <div className="mb-4">
              <p className="text-sm font-medium text-dark-900 truncate">{user.name}</p>
              <p className="text-xs text-dark-500 truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 capitalize">
                {user.riskProfile}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <NavLink
                to="/settings"
                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-dark-600 hover:bg-dark-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Configurações</span>
              </NavLink>
            )}
            {isCollapsed && (
              <NavLink
                to="/settings"
                className="p-2 text-dark-600 hover:bg-dark-100 rounded-lg transition-colors"
                title="Configurações"
              >
                <Settings className="w-5 h-5" />
              </NavLink>
            )}
            <button
              onClick={() => logout()}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors',
                isCollapsed && 'justify-center p-2'
              )}
              title={isCollapsed ? 'Sair' : undefined}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          </div>
          
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 bg-dark-100 border border-dark-200 rounded-r-lg hidden lg:flex items-center justify-center hover:bg-dark-200 transition-colors"
            aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
