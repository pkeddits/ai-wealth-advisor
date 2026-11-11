export type AppMode = 'demo' | 'supabase' | 'api';

function resolveMode(): AppMode {
  const requested = import.meta.env.VITE_APP_MODE;
  if (requested === 'demo' || requested === 'supabase' || requested === 'api') return requested;
  // Compatibilidade com a configuração da Fase 1 (VITE_DEMO_MODE=false => backend Go).
  if (import.meta.env.VITE_DEMO_MODE === 'false') return 'api';
  return 'demo';
}

export const appMode: AppMode = resolveMode();
export const isDemoMode = appMode === 'demo';
export const isSupabaseMode = appMode === 'supabase';
export const isApiMode = appMode === 'api';
