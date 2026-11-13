import { appMode } from '../config/appMode';
import { getSupabase } from '../lib/supabase';

/**
 * Preferências da conta que valem entre dispositivos. Na demonstração ficam neste navegador.
 * A opção de reapresentar os guias é aplicada (e desativada) somente em um login explícito.
 */
const DEMO_KEY = 'aiwa.demo.userSettings.v1';

export const userSettings = {
  async tutorialsOnNextLogin(): Promise<boolean> {
    if (appMode === 'demo') return Boolean(JSON.parse(localStorage.getItem(DEMO_KEY) ?? '{}').tutorialsOnNextLogin);
    if (appMode !== 'supabase') return false;
    const { data, error } = await getSupabase().from('user_settings').select('tutorials_on_next_login').maybeSingle();
    if (error) throw new Error('Não foi possível carregar a preferência.');
    return Boolean(data?.tutorials_on_next_login);
  },

  async setTutorialsOnNextLogin(value: boolean): Promise<void> {
    if (appMode === 'demo') {
      localStorage.setItem(DEMO_KEY, JSON.stringify({ tutorialsOnNextLogin: value }));
      return;
    }
    if (appMode !== 'supabase') return;
    const { error } = await getSupabase().from('user_settings').upsert({ tutorials_on_next_login: value }, { onConflict: 'user_id' });
    if (error) throw new Error('Não foi possível salvar a preferência.');
  },

  /** Retorna true se a opção estava ativa, desativando-a em seguida. */
  async consumeTutorialsOnNextLogin(): Promise<boolean> {
    try {
      if (!(await this.tutorialsOnNextLogin())) return false;
      await this.setTutorialsOnNextLogin(false);
      return true;
    } catch {
      return false;
    }
  },
};
