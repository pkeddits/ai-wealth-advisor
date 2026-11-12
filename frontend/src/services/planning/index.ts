import { create } from 'zustand';
import { appMode } from '../../config/appMode';
import { unavailableService } from '../unavailable';
import { demoPlanningService } from './demo';
import { supabasePlanningService } from './supabase';
import type { CustomCategory, PlanningService } from './types';

export const planningService: PlanningService =
  appMode === 'demo' ? demoPlanningService : appMode === 'supabase' ? supabasePlanningService : unavailableService<PlanningService>('Planejamento');

/** Categorias personalizadas do usuário, carregadas uma vez e compartilhadas pelas telas. */
export const useCustomCategories = create<{ list: CustomCategory[]; loaded: boolean; load: () => Promise<void> }>((set) => ({
  list: [],
  loaded: false,
  load: async () => {
    try {
      set({ list: await planningService.categories(), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));

export * from './types';
export { clearDemoPlanning } from './demo';
