import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import clsx from 'clsx';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-dark-50">
      <Sidebar />
      <div className="lg:ml-64">
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
    <div className="min-h-screen bg-dark-50 flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
