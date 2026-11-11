import type { PostgrestError } from '@supabase/supabase-js';

/** Converte erros do PostgREST/PostgreSQL em mensagens para o usuário. */
export function dbError(error: PostgrestError | null, fallback: string): Error {
  if (!error) return new Error(fallback);
  if (error.code === '23514' && /Venda maior/.test(error.message)) {
    return new Error('Venda maior que a quantidade disponível do ativo nesta carteira.');
  }
  if (error.code === '23514' && /futuro/.test(error.message)) return new Error('A data da operação não pode estar no futuro.');
  if (error.code === '23514') return new Error('Os dados informados não são válidos. Revise os valores.');
  if (error.code === '23503') return new Error('Carteira ou ativo inválido para esta operação.');
  if (error.code === '42501') return new Error('Você não tem permissão para esta operação.');
  if (error.code === 'PGRST116') return new Error('Registro não encontrado.');
  if (error.code === 'PGRST301' || /JWT/i.test(error.message)) return new Error('Sua sessão expirou. Entre novamente.');
  return new Error(fallback);
}
