import type { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { MainLayout, AuthLayout } from './components/layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PortfoliosPage } from './pages/PortfoliosPage';
import { PortfolioDetailPage } from './pages/PortfolioDetailPage';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SimulationsPage } from './pages/SimulationsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ComingSoon } from './components/common/ComingSoon';
import { LandingPage } from './pages/LandingPage';
import { FinancePage } from './pages/FinancePage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { appMode, isDemoMode } from './config/appMode';
import { usePreferences } from './store/preferencesStore';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to={usePreferences.getState().homePage} replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route
          path="/register"
          element={isDemoMode ? <Navigate to="/login" replace /> : <PublicRoute><RegisterPage /></PublicRoute>}
        />
      </Route>
      
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/portfolios" element={<ProtectedRoute><PortfoliosPage /></ProtectedRoute>} />
        <Route path="/portfolios/:id" element={<ProtectedRoute><PortfolioDetailPage /></ProtectedRoute>} />
        <Route path="/ai-analysis" element={<ProtectedRoute><AIAnalysisPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/simulations" element={<ProtectedRoute><SimulationsPage /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/integracoes" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
        <Route path="/financas" element={<ProtectedRoute>{appMode === 'api' ? <ComingSoon title="Finanças pessoais" description="Receitas, despesas e categorias." /> : <FinancePage />}</ProtectedRoute>} />
      </Route>
      
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
