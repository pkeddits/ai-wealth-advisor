import { create } from 'zustand';
import type { Portfolio, Position, Transaction } from '../types';
import { portfolioService } from '../services';
import React from 'react';

interface PortfolioState {
  portfolios: Portfolio[];
  currentPortfolio: Portfolio | null;
  positions: Position[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchPortfolios: () => Promise<void>;
  createPortfolio: (data: { name: string; description?: string; riskProfile: 'conservador' | 'moderado' | 'arrojado' }) => Promise<Portfolio>;
  selectPortfolio: (portfolio: Portfolio) => Promise<void>;
  fetchPositions: (portfolioId: string) => Promise<void>;
  fetchTransactions: (portfolioId: string) => Promise<void>;
  addTransaction: (data: any) => Promise<void>;
  refreshCurrentPortfolio: () => Promise<void>;
}

/**
 * Aceita tanto { data: [...] } quanto um array puro e nunca devolve undefined.
 * Evita tela branca (".reduce of undefined") quando a API responde algo inesperado.
 */
function toArray<T>(response: unknown, what: string): T[] {
  if (Array.isArray(response)) return response as T[];
  const data = (response as { data?: unknown } | null)?.data;
  if (Array.isArray(data)) return data as T[];
  throw new Error(`Resposta inválida ao carregar ${what}.`);
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  currentPortfolio: null,
  positions: [],
  transactions: [],
  isLoading: false,
  error: null,
  
  fetchPortfolios: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await portfolioService.list();
      set({ portfolios: toArray<Portfolio>(response, 'carteiras'), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  createPortfolio: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const portfolio = await portfolioService.create(data);
      set((state) => ({ portfolios: [...state.portfolios, portfolio], isLoading: false }));
      return portfolio;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  selectPortfolio: async (portfolio: Portfolio) => {
    set({ currentPortfolio: portfolio, isLoading: true });
    try {
      await Promise.all([
        get().fetchPositions(portfolio.id),
        get().fetchTransactions(portfolio.id),
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchPositions: async (portfolioId: string) => {
    try {
      const positions = await portfolioService.getPositions(portfolioId);
      set({ positions: toArray<Position>(positions, 'posições') });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  fetchTransactions: async (portfolioId: string) => {
    try {
      const response = await portfolioService.getByPortfolio(portfolioId);
      set({ transactions: toArray<Transaction>(response, 'transações') });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  addTransaction: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await portfolioService.createTransaction(data);
      if (get().currentPortfolio) {
        await get().fetchPositions(get().currentPortfolio!.id);
        await get().fetchTransactions(get().currentPortfolio!.id);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  refreshCurrentPortfolio: async () => {
      const portfolio = get().currentPortfolio;
      if (portfolio) {
        await get().selectPortfolio(portfolio);
      }
    },
  }));

  export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const fetchPortfolios = usePortfolioStore((state) => state.fetchPortfolios);
  
  React.useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);
  
  return <>{children}</>;
};

