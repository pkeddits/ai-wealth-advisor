import { authService } from '../auth';
import type { SessionGateway } from './types';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Sessão baseada nos tokens JWT do backend Go original. */
export const apiSession: SessionGateway = {
  async restore() {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!localStorage.getItem(ACCESS_KEY) || !refresh) return null;
    try {
      return await authService.getMe();
    } catch {
      try {
        const tokens = await authService.refreshToken(refresh);
        storeTokens(tokens.access_token, tokens.refresh_token);
        return await authService.getMe();
      } catch {
        clearTokens();
        return null;
      }
    }
  },
  async signIn(email, password) {
    const response = await authService.login({ email, password });
    storeTokens(response.access_token, response.refresh_token);
    return response.user;
  },
  async signUp(input) {
    const response = await authService.register(input);
    storeTokens(response.access_token, response.refresh_token);
    return { user: response.user, requiresEmailConfirmation: false };
  },
  async signOut() {
    try {
      await authService.logout();
    } finally {
      clearTokens();
    }
  },
};
