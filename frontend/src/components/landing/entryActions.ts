import { isDemoMode } from '../../config/appMode';
import { usePreferences } from '../../store/preferencesStore';

export interface EntryAction {
  to: string;
  label: string;
}

export function getEntryActions(isAuthenticated: boolean): { primary: EntryAction; secondary: EntryAction | null } {
  if (isAuthenticated) return { primary: { to: usePreferences.getState().homePage, label: 'Abrir painel' }, secondary: null };
  if (isDemoMode) {
    return { primary: { to: '/login', label: 'Explorar a demonstração' }, secondary: null };
  }
  return { primary: { to: '/register', label: 'Criar conta' }, secondary: { to: '/login', label: 'Entrar' } };
}
