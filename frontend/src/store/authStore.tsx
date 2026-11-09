import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authService } from '../services';
import React from 'react';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; riskProfile: 'conservador' | 'moderado' | 'arrojado' }) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      
      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      
      setUser: (user: User) => set({ user }),
      
      login: async (email: string, password: string) => {
        const response = await authService.login({ email, password });
        get().setTokens(response.access_token, response.refresh_token);
        set({ user: response.user });
      },
      
      register: async (data) => {
        const response = await authService.register(data);
        get().setTokens(response.access_token, response.refresh_token);
        set({ user: response.user });
      },
      
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },
      
      checkAuth: async () => {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!accessToken || !refreshToken) {
          set({ isLoading: false });
          return;
        }
        
        set({ accessToken, refreshToken, isAuthenticated: true });
        
        try {
          const user = await authService.getMe();
          set({ user, isLoading: false });
        } catch {
          // Token might be expired, try refresh
          try {
            const tokens = await authService.refreshToken(refreshToken);
            get().setTokens(tokens.access_token, tokens.refresh_token);
            const user = await authService.getMe();
            set({ user, isLoading: false });
          } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const getAuthTokens = () => {
  const state = useAuthStore.getState();
  return {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
  };
};

export const setAuthTokens = (accessToken: string, refreshToken: string) => {
  useAuthStore.getState().setTokens(accessToken, refreshToken);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  
  // Initialize auth on mount
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return <>{children}</>;
};

