import { useEffect, useRef, type ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePortfolioStore } from '../../store/portfolioStore';
import { clearQuoteCache } from '../../services/quotes';
import { useChatStore } from '../../services/assistant';

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
    const chat = useChatStore.getState();
    // Na restauração da sessão o usuário começa nulo: só descarta a conversa quando outra conta
    // entra ou quando uma sessão existente termina.
    if (userId && chat.owner !== userId) chat.reset(userId);
    if (!userId && previous.current) chat.reset(null);
    previous.current = userId;
  }, [userId]);

  return <>{children}</>;
}
