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
import { AccountHomePage } from './pages/AccountHomePage';
import { appMode, isDemoMode, isSupabaseMode } from './config/appMode';
import { usePreferences } from './store/preferencesStore';

/**
 * Módulos indisponíveis no modo atual exibem "Em desenvolvimento". No modo Supabase,
 * carteiras ainda não foram migradas para o banco; nos demais módulos só a API Go
 * (modo "api") tem implementação.
 */
const portfolioModule = (page: ReactNode, title: string, description: string) =>
  isSupabaseMode ? <ComingSoon title={title} description={description} /> : page;

const apiOnlyModule = (page: ReactNode, title: string, description: string) =>
  appMode === 'api' ? page : <ComingSoon title={title} description={description} />;

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
        <Route path="/dashboard" element={<ProtectedRoute>{isSupabaseMode ? <AccountHomePage /> : <DashboardPage />}</ProtectedRoute>} />
        <Route path="/portfolios" element={<ProtectedRoute>{portfolioModule(<PortfoliosPage />, 'Carteiras', 'Carteiras, posições e operações registradas na sua conta.')}</ProtectedRoute>} />
        <Route path="/portfolios/:id" element={<ProtectedRoute>{portfolioModule(<PortfolioDetailPage />, 'Carteira', 'Posições, transações e distribuição da carteira.')}</ProtectedRoute>} />
        <Route path="/ai-analysis" element={<ProtectedRoute>{apiOnlyModule(<AIAnalysisPage />, 'Análise com IA', 'Explicações geradas por IA sobre a composição e os riscos da carteira, a partir de métricas calculadas pelo sistema.')}</ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute>{apiOnlyModule(<AnalyticsPage />, 'Analytics', 'Métricas de risco e retorno da carteira, como volatilidade, drawdown e índice de Sharpe.')}</ProtectedRoute>} />
        <Route path="/simulations" element={<ProtectedRoute>{apiOnlyModule(<SimulationsPage />, 'Simulações', 'Projeções de Monte Carlo e testes de estresse para cenários de mercado.')}</ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute>{apiOnlyModule(<AlertsPage />, 'Alertas', 'Avisos quando um ativo ou a carteira atingir um valor definido por você.')}</ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Route>
      
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
