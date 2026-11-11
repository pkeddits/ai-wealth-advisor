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
import { supabasePortfolioService, supabaseTransactionService, supabaseAssetService } from './supabase';

function pick<T extends object>(demo: T, api: T, supabase: T): T {
  if (appMode === 'demo') return demo;
  if (appMode === 'supabase') return supabase;
  return api;
}

export const authService = pick(demoAuthService, apiAuthService, unavailableService<typeof apiAuthService>('Gestão de conta'));
export const portfolioService = pick(demoPortfolioService, apiPortfolioService, supabasePortfolioService);
export const transactionService = pick(demoTransactionService, apiTransactionService, supabaseTransactionService);
export const assetService = pick(demoAssetService, apiAssetService, supabaseAssetService);

// Ainda sem versão demo: as páginas que os usam ficam "Em desenvolvimento" no modo demo.
export { aiService } from './ai';
export { alertService } from './alert';
export { analyticsService } from './analytics';
export { simulationService } from './simulation';
export { default as api } from './api';
