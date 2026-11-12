import type { FinanceEntryInput } from '../../types';
import { CATEGORIES } from './categories';

export function validateEntry(input: Partial<FinanceEntryInput>): FinanceEntryInput {
  if (input.kind !== 'receita' && input.kind !== 'despesa') throw new Error('Escolha receita ou despesa.');
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor maior que zero.');
  if (amount >= 1e12) throw new Error('Valor acima do permitido.');
  const custom = /^custom:[0-9a-f-]{36}$/.test(input.category ?? '');
  if (!input.category || (!custom && !(input.category in CATEGORIES))) throw new Error('Escolha uma categoria.');
  if (!custom && !CATEGORIES[input.category].kinds.includes(input.kind)) throw new Error('Categoria incompatível com o tipo do lançamento.');
  const description = input.description?.trim() ?? '';
  if (!description) throw new Error('Informe uma descrição.');
  if (description.length > 200) throw new Error('A descrição deve ter no máximo 200 caracteres.');
  if (!input.occurredOn || !/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn) || input.occurredOn < '2000-01-01') throw new Error('Informe uma data válida.');
  return { kind: input.kind, amount, category: input.category, description, occurredOn: input.occurredOn };
}
