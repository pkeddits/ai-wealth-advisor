import type { User } from '../types';
import { appMode } from '../config/appMode';
import { getSupabase } from '../lib/supabase';
import { authService } from './auth';
import { loadState } from './demo/storage';

export interface ProfileUpdate {
  name: string;
  riskProfile: User['riskProfile'];
}

const DEMO_PROFILE_KEY = 'aiwa.demo.profile';

export function readDemoProfile(): ProfileUpdate | null {
  try {
    const raw = localStorage.getItem(DEMO_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ProfileUpdate) : null;
  } catch {
    return null;
  }
}

export function clearDemoProfile() {
  localStorage.removeItem(DEMO_PROFILE_KEY);
}

export async function updateProfile(user: User, data: ProfileUpdate): Promise<User> {
  const name = data.name.trim();
  if (name.length < 2 || name.length > 120) throw new Error('O nome deve ter entre 2 e 120 caracteres.');
  const updatedAt = new Date().toISOString();

  if (appMode === 'demo') {
    localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify({ name, riskProfile: data.riskProfile }));
    return { ...user, name, riskProfile: data.riskProfile, updatedAt };
  }

  if (appMode === 'supabase') {
    const { data: row, error } = await getSupabase()
      .from('profiles')
      .update({ full_name: name, risk_profile: data.riskProfile })
      .eq('id', user.id)
      .select('full_name, risk_profile, updated_at')
      .single();
    if (error || !row) throw new Error('Não foi possível salvar o perfil. Tente novamente.');
    return { ...user, name: row.full_name, riskProfile: row.risk_profile, updatedAt: row.updated_at };
  }

  return authService.updateProfile({ name, riskProfile: data.riskProfile });
}

export async function changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
  if (appMode === 'demo') throw new Error('A troca de senha não está disponível no modo demonstração.');

  if (appMode === 'supabase') {
    const supabase = getSupabase();
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (check.error) throw new Error('Senha atual incorreta.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.code === 'same_password' ? 'A nova senha deve ser diferente da atual.' : 'Não foi possível alterar a senha.');
    return;
  }

  await authService.changePassword(currentPassword, newPassword);
}

/** Baixa as carteiras e transações da demonstração em JSON. */
export function exportDemoData() {
  const state = loadState();
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wealth-advisor-demonstracao-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
