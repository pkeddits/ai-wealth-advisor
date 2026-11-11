import { demoAuthService } from '../demo';
import { AuthError, type SessionGateway } from './types';

const SESSION_KEY = 'aiwa.demo.session';

export const demoSession: SessionGateway = {
  async restore() {
    return localStorage.getItem(SESSION_KEY) ? demoAuthService.getMe() : null;
  },
  async signIn() {
    const { user } = await demoAuthService.login({ email: '', password: '' });
    localStorage.setItem(SESSION_KEY, '1');
    return user;
  },
  async signUp() {
    throw new AuthError('Criação de conta não está disponível no modo demonstração.');
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
};
