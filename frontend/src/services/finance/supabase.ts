import type { FinanceEntry, FinanceEntryInput } from '../../types';
import { monthRange } from '../../domain/finance';
import { getSupabase } from '../../lib/supabase';
import { dbError } from '../supabase/errors';
import type { FinanceService } from './types';
import { validateEntry } from './validation';

const COLUMNS = 'id, kind, amount, category, description, occurred_on, source, created_at, updated_at';

interface EntryRow {
  id: string;
  kind: FinanceEntry['kind'];
  amount: number | string;
  category: FinanceEntry['category'];
  description: string;
  occurred_on: string;
  source: FinanceEntry['source'];
  created_at: string;
  updated_at: string;
}

const toEntry = (row: EntryRow): FinanceEntry => ({
  id: row.id,
  kind: row.kind,
  amount: Number(row.amount),
  category: row.category,
  description: row.description,
  occurredOn: row.occurred_on,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRow = (input: FinanceEntryInput) => {
  const v = validateEntry(input);
  return { kind: v.kind, amount: v.amount, category: v.category, description: v.description, occurred_on: v.occurredOn };
};

export const supabaseFinanceService: FinanceService = {
  async list(month) {
    const { from, to } = monthRange(month);
    const { data, error } = await getSupabase()
      .from('finance_entries')
      .select(COLUMNS)
      .gte('occurred_on', from)
      .lt('occurred_on', to)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw dbError(error, 'Não foi possível carregar as movimentações.');
    return ((data ?? []) as EntryRow[]).map(toEntry);
  },
  async create(input) {
    const { data, error } = await getSupabase().from('finance_entries').insert(toRow(input)).select(COLUMNS).single();
    if (error || !data) throw dbError(error, 'Não foi possível salvar a movimentação.');
    return toEntry(data as EntryRow);
  },
  async update(id, input) {
    const { data, error } = await getSupabase().from('finance_entries').update(toRow(input)).eq('id', id).select(COLUMNS).maybeSingle();
    if (error) throw dbError(error, 'Não foi possível salvar a movimentação.');
    if (!data) throw new Error('Lançamento não encontrado.');
    return toEntry(data as EntryRow);
  },
  async delete(id) {
    const { data, error } = await getSupabase().from('finance_entries').delete().eq('id', id).select('id');
    if (error) throw dbError(error, 'Não foi possível excluir a movimentação.');
    if (!data?.length) throw new Error('Lançamento não encontrado.');
  },
};
