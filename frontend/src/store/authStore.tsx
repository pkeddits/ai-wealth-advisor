import { create } from 'zustand';
import { useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { session, type SignUpInput, type SignUpResult } from '../services/session';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: SignUpInput) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  initError: null,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    const user = await session.signIn(email, password);
    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    const result = await session.signUp(data);
    if (result.user && !result.requiresEmailConfirmation) {
      set({ user: result.user, isAuthenticated: true });
    }
    return result;
  },

  logout: async () => {
    try {
      await session.signOut();
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    try {
      const user = await session.restore();
      set({ user, isAuthenticated: Boolean(user), isLoading: false, initError: null });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        initError: error instanceof Error ? error.message : 'Não foi possível verificar a sessão.',
      });
    }
  },
}));

export function AuthProvider({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
    return session.subscribe?.((user) => {
      useAuthStore.setState({ user, isAuthenticated: Boolean(user) });
    });
  }, [checkAuth]);

  return <>{children}</>;
}
