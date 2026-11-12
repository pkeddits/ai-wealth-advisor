import { appMode } from '../../config/appMode';
import { unavailableService } from '../unavailable';
import { demoFinanceService } from './demo';
import { supabaseFinanceService } from './supabase';
import type { FinanceService } from './types';

export const financeService: FinanceService =
  appMode === 'demo' ? demoFinanceService : appMode === 'supabase' ? supabaseFinanceService : unavailableService<FinanceService>('Finanças pessoais');

export { CATEGORIES, categoriesFor, categoryMeta } from './categories';
export { loadDemoFinanceSample, clearDemoFinance } from './demo';
export type { FinanceService } from './types';
