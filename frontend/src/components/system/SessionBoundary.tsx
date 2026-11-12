import { useEffect, useRef, type ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePortfolioStore } from '../../store/portfolioStore';
import { clearQuoteCache } from '../../services/quotes';

const EMPTY_PORTFOLIO_STATE = {
  portfolios: [],
  currentPortfolio: null,
  positions: [],
  transactions: [],
  isLoading: false,
  error: null,
};

/**
 * Descarta dados financeiros em memória sempre que o usuário autenticado muda
 * (logout, troca de conta ou expiração da sessão), para que nada de uma conta
 * apareça na seguinte.
 */
export function SessionBoundary({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const previous = useRef(userId);

  useEffect(() => {
    if (previous.current !== userId) {
      usePortfolioStore.setState(EMPTY_PORTFOLIO_STATE);
      clearQuoteCache();
    }
    previous.current = userId;
  }, [userId]);

  return <>{children}</>;
}
