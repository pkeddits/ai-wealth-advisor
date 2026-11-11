/**
 * Ponto único de escolha entre backend real (API) e modo demonstração.
 * As páginas e stores devem importar os services SEMPRE daqui ('../services').
 */
import { appMode } from '../config/appMode';
import { unavailableService } from './unavailable';
import { authService as apiAuthService } from './auth';
import { portfolioService as apiPortfolioService } from './portfolio';
import { transactionService as apiTransactionService } from './transaction';
import { assetService as apiAssetService } from './asset';
import { demoAuthService, demoPortfolioService, demoTransactionService, demoAssetService } from './demo';

function pick<T extends object>(demo: T, api: T, feature: string): T {
  if (appMode === 'demo') return demo;
  if (appMode === 'supabase') return unavailableService<T>(feature);
  return api;
}

export const authService = pick(demoAuthService, apiAuthService, 'Gestão de conta');
export const portfolioService = pick(demoPortfolioService, apiPortfolioService, 'Carteiras no banco de dados');
export const transactionService = pick(demoTransactionService, apiTransactionService, 'Transações no banco de dados');
export const assetService = pick(demoAssetService, apiAssetService, 'Catálogo de ativos');

// Ainda sem versão demo: as páginas que os usam ficam "Em desenvolvimento" no modo demo.
export { aiService } from './ai';
export { alertService } from './alert';
export { analyticsService } from './analytics';
export { simulationService } from './simulation';
export { default as api } from './api';
