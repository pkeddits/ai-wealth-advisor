/**
 * Ponto único de escolha entre backend real (API) e modo demonstração.
 * As páginas e stores devem importar os services SEMPRE daqui ('../services').
 */
import { isDemoMode } from '../config/appMode';
import { authService as apiAuthService } from './auth';
import { portfolioService as apiPortfolioService } from './portfolio';
import { transactionService as apiTransactionService } from './transaction';
import { assetService as apiAssetService } from './asset';
import { demoAuthService, demoPortfolioService, demoTransactionService, demoAssetService } from './demo';

export const authService = isDemoMode ? demoAuthService : apiAuthService;
export const portfolioService = isDemoMode ? demoPortfolioService : apiPortfolioService;
export const transactionService = isDemoMode ? demoTransactionService : apiTransactionService;
export const assetService = isDemoMode ? demoAssetService : apiAssetService;

// Ainda sem versão demo: as páginas que os usam ficam "Em desenvolvimento" no modo demo.
export { aiService } from './ai';
export { alertService } from './alert';
export { analyticsService } from './analytics';
export { simulationService } from './simulation';
export { default as api } from './api';
