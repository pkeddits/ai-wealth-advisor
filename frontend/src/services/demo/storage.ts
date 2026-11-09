import type { Transaction } from '../../types';

/** Dados persistidos da demonstração (somente neste navegador). */
export interface DemoPortfolioRecord {
  id: string;
  name: string;
  description?: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
  createdAt: string;
  updatedAt: string;
}

export interface DemoState {
  version: 1;
  portfolios: DemoPortfolioRecord[];
  transactions: Omit<Transaction, 'asset'>[];
}

const KEY = 'aiwa.demo.v1';
const empty = (): DemoState => ({ version: 1, portfolios: [], transactions: [] });

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.portfolios) || !Array.isArray(parsed.transactions)) return empty();
    return parsed as DemoState;
  } catch {
    return empty();
  }
}

export function saveState(state: DemoState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearDemoData(): void {
  localStorage.removeItem(KEY);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Erro padronizado para recursos que não existem no modo demonstração. */
export class DemoUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} não está disponível no modo demonstração.`);
    this.name = 'DemoUnavailableError';
  }
}
