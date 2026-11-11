import type { AuthError as SupabaseAuthError, User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '../../types';
import { getSupabase } from '../../lib/supabase';
import { AuthError, type RiskProfile, type SessionGateway } from './types';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, combinando letras e números.',
  over_email_send_rate_limit: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.',
  over_request_rate_limit: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.',
  signup_disabled: 'O cadastro de novas contas está desativado no momento.',
  email_address_invalid: 'Informe um e-mail válido.',
  validation_failed: 'Dados inválidos. Revise os campos e tente novamente.',
};

function toAuthError(error: SupabaseAuthError): AuthError {
  if (error.code && MESSAGES[error.code]) return new AuthError(MESSAGES[error.code], error.code);
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return new AuthError('Não foi possível conectar ao serviço de autenticação. Verifique sua conexão.', 'network');
  }
  if (/invalid login credentials/i.test(error.message)) return new AuthError(MESSAGES.invalid_credentials, 'invalid_credentials');
  if (/already registered/i.test(error.message)) return new AuthError(MESSAGES.user_already_exists, 'user_already_exists');
  return new AuthError('Não foi possível concluir a operação. Tente novamente.', error.code);
}

function isRiskProfile(value: unknown): value is RiskProfile {
  return value === 'conservador' || value === 'moderado' || value === 'arrojado';
}

interface ProfileRow {
  full_name: string;
  risk_profile: RiskProfile;
  created_at: string;
  updated_at: string;
}

async function toUser(authUser: SupabaseUser): Promise<User> {
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('full_name, risk_profile, created_at, updated_at')
    .eq('id', authUser.id)
    .maybeSingle<ProfileRow>();

  const metadata = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: profile?.full_name || (typeof metadata.name === 'string' ? metadata.name : '') || authUser.email?.split('@')[0] || '',
    riskProfile: profile?.risk_profile ?? (isRiskProfile(metadata.risk_profile) ? metadata.risk_profile : 'moderado'),
    createdAt: profile?.created_at ?? authUser.created_at,
    updatedAt: profile?.updated_at ?? authUser.updated_at ?? authUser.created_at,
  };
}

export const supabaseSession: SessionGateway = {
  async restore() {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw toAuthError(error);
    return data.session ? toUser(data.session.user) : null;
  },

  async signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAuthError(error);
    return toUser(data.user);
  },

  async signUp({ name, email, password, riskProfile }) {
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), risk_profile: riskProfile },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw toAuthError(error);
    // Com confirmação de e-mail ativa, o Supabase cria o usuário sem sessão.
    if (!data.session || !data.user) return { user: null, requiresEmailConfirmation: true };
    return { user: await toUser(data.user), requiresEmailConfirmation: false };
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw toAuthError(error);
  },

  subscribe(listener) {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') listener(null);
      // Adiado para fora do callback: chamadas ao Supabase dentro dele podem travar o cliente.
      else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) setTimeout(() => toUser(session.user).then(listener).catch(() => undefined), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  },
};
