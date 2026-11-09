import { useAuthStore } from '../../store/authStore';
import { LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export function Header() {
  const { user } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-dark-200">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openMobileNav}
            className="lg:hidden p-2 -ml-2 rounded-lg text-dark-600 hover:bg-dark-100"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-dark-900 hidden sm:block">
            AI Wealth Advisor
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Tema escuro e notificações foram removidos: não estavam implementados. */}

          {/* User Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-dark-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-700" />
              </div>
              <span className="hidden md:block text-sm font-medium text-dark-700">{user?.name}</span>
              <ChevronDown className="w-4 h-4 text-dark-500 hidden md:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-dark-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-dark-200">
                  <p className="text-sm font-medium text-dark-900">{user?.name}</p>
                  <p className="text-xs text-dark-500">{user?.email}</p>
                </div>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-dark-700 hover:bg-dark-100"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Perfil
                </NavLink>
                <button
                  onClick={() => {
                    useAuthStore.getState().logout();
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
