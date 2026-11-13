import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePortfolioStore } from '../../store/portfolioStore';
import { clearQuoteCache } from '../../services/quotes';
import { useChatStore } from '../../services/assistant';
import { useConversations } from '../../services/conversations';
import { useCustomCategories } from '../../services/planning';
import { clearAvatarUrls } from '../../services/accountSync';

const EMPTY_PORTFOLIO_STATE = {
  portfolios: [],
  currentPortfolio: null,
  positions: [],
  transactions: [],
  isLoading: false,
  error: null,
};

/**
 * Descarta dados privados em memória no mesmo instante em que o usuário autenticado muda
 * (logout, troca de conta ou expiração da sessão). A assinatura roda de forma síncrona com a
 * atualização do authStore, antes da próxima renderização, então nenhum quadro da nova sessão
 * mostra carteiras, conversas ou categorias da anterior.
 */
let previous: string | null = useAuthStore.getState().user?.id ?? null;

useAuthStore.subscribe((state) => {
  const userId = state.user?.id ?? null;
  if (userId === previous) return;
  const hadUser = previous !== null;
  previous = userId;
  if (hadUser) {
    usePortfolioStore.setState(EMPTY_PORTFOLIO_STATE);
    clearQuoteCache();
    clearAvatarUrls();
    useCustomCategories.setState({ list: [], loaded: false });
  }
  const chat = useChatStore.getState();
  // Na restauração da sessão o usuário começa nulo: só descarta a conversa quando outra conta
  // entra ou quando uma sessão existente termina.
  if (userId && chat.owner !== userId) {
    chat.reset(userId);
    useConversations.getState().clear();
  }
  if (!userId && hadUser) {
    chat.reset(null);
    useConversations.getState().clear();
  }
});

export function SessionBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
