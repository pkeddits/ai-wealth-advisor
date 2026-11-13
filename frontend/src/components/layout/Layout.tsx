import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useProfileSync } from '../../hooks/useProfileSync';
import { FloatingAssistant } from '../ai/FloatingAssistant';
import { TutorialHost } from '../tutorial/TutorialHost';
import { useFrameGuard } from '../../hooks/useFrameGuard';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoBanner } from '../common/DemoBanner';
import { AuthPanel, AuthMobileHeader } from '../auth/AuthPanel';
import { isDemoMode } from '../../config/appMode';

export function MainLayout() {
  const location = useLocation();
  const collapsed = useUIStore((s) => s.isSidebarCollapsed);
  useProfileSync();
  useFrameGuard();

  return (
    <div className="relative min-h-screen">
      <div className="ambient-orb -left-40 top-24 h-[420px] w-[420px] text-primary-500/30" style={{ zIndex: -1 }} aria-hidden="true" />
      <div className="ambient-orb -right-40 bottom-0 h-[380px] w-[380px] text-blue-500/25" style={{ zIndex: -1, animationDelay: '-9s' }} aria-hidden="true" />
      <div className="ambient-orb left-[38%] top-[42%] h-[340px] w-[340px] text-accent-500/15" style={{ zIndex: -1, animationDelay: '-17s' }} aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(var(--violet)/0.12),transparent)]" style={{ zIndex: -1 }} aria-hidden="true" />
      <div className="fx-decor pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-48 left-1/3 h-[520px] w-[720px] rounded-full bg-primary-500/[0.08] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[620px] rounded-full bg-blue-500/[0.06] blur-[120px]" />
      </div>
      <Sidebar />
      <div className={clsx('transition-[padding] duration-300 ease-out', collapsed ? 'lg:pl-[96px]' : 'lg:pl-[268px]')}>
        {isDemoMode && <DemoBanner />}
        <Header />
        <motion.main
          key={location.pathname}
          className="px-4 pb-12 pt-6 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>
      <FloatingAssistant />
      <TutorialHost />
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthPanel />
      <div className="flex min-h-screen flex-col">
        <AuthMobileHeader />
        <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-md animate-rise">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
