import type { User } from '../../types';

export type RiskProfile = User['riskProfile'];

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  riskProfile: RiskProfile;
}

export interface SignUpResult {
  user: User | null;
  requiresEmailConfirmation: boolean;
}

/** Contrato de sessão usado pelo authStore, independente do provedor de autenticação. */
export interface SessionGateway {
  restore(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
  /** Notifica mudanças de sessão feitas fora da aplicação (expiração, outra aba). */
  subscribe?(listener: (user: User | null) => void): () => void;
}

export class AuthError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}
