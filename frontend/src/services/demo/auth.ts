import type { authService as apiAuthService } from '../auth';
import type { User } from '../../types';
import { DemoUnavailableError } from './storage';

const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Visitante',
  email: 'demonstracao@aiwealth.local',
  riskProfile: 'moderado',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const DEMO_TOKENS = { access_token: 'demo-access', refresh_token: 'demo-refresh' };

/**
 * Autenticação simulada: não há conta, senha nem servidor.
 * O login da demonstração ignora as credenciais; a tela de login só o
 * oferece por meio do botão "Entrar no modo demonstração".
 */
export const demoAuthService: typeof apiAuthService = {
  register: async () => {
    throw new DemoUnavailableError('Criação de conta');
  },
  login: async () => ({ user: DEMO_USER, ...DEMO_TOKENS }),
  logout: async () => {},
  refreshToken: async () => DEMO_TOKENS,
  getMe: async () => DEMO_USER,
  updateProfile: async () => {
    throw new DemoUnavailableError('Edição de perfil');
  },
  changePassword: async () => {
    throw new DemoUnavailableError('Troca de senha');
  },
};
