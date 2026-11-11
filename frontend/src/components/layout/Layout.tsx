import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoBanner } from '../common/DemoBanner';
import { AuthPanel, AuthMobileHeader } from '../auth/AuthPanel';
import { isDemoMode } from '../../config/appMode';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-dark-50">
      <Sidebar />
      <div className="lg:ml-64">
        {isDemoMode && <DemoBanner />}
        <Header />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
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
