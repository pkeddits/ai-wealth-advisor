import { getSupabase } from '../../lib/supabase';
import { dbError } from '../supabase/errors';
import type { PlanningService } from './types';
import { validateAmount, validateCategoryName, validateGoal } from './validation';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function friendly(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === '23514' && /retirada/i.test(error.message ?? '')) return new Error('A retirada é maior que o valor guardado na meta.');
  if (error?.code === '23505') return new Error('Já existe um registro com esses dados.');
  return dbError(error as never, fallback);
}

export const supabasePlanningService: PlanningService = {
  async goals() {
    const { data, error } = await getSupabase().from('goals').select('id, name, kind, target_amount, target_date, planned_monthly, created_at, movements:goal_movements(id, goal_id, kind, amount, occurred_on, note)').order('created_at');
    if (error) throw friendly(error, 'Não foi possível carregar as metas.');
    return (data ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      targetAmount: Number(g.target_amount),
      targetDate: g.target_date,
      plannedMonthly: g.planned_monthly === null || g.planned_monthly === undefined ? null : Number(g.planned_monthly),
      createdAt: g.created_at,
      movements: (g.movements ?? []).map((m: any) => ({ id: m.id, goalId: m.goal_id, kind: m.kind, amount: Number(m.amount), occurredOn: m.occurred_on, note: m.note })).sort((a: any, b: any) => b.occurredOn.localeCompare(a.occurredOn)),
    }));
  },
  async createGoal(input) {
    const v = validateGoal(input);
    const { data, error } = await getSupabase().from('goals').insert({ name: v.name, kind: v.kind, target_amount: v.targetAmount, target_date: v.targetDate, planned_monthly: v.plannedMonthly }).select('id').single();
    if (error || !data) throw friendly(error, 'Não foi possível criar a meta.');
    if (v.initialAmount) {
      const { error: e2 } = await getSupabase().from('goal_movements').insert({ goal_id: data.id, kind: 'inicial', amount: v.initialAmount, occurred_on: today() });
      if (e2) throw friendly(e2, 'A meta foi criada, mas o valor inicial não foi salvo.');
    }
  },
  async updateGoal(id, input) {
    const v = validateGoal(input);
    const { error } = await getSupabase().from('goals').update({ name: v.name, kind: v.kind, target_amount: v.targetAmount, target_date: v.targetDate, planned_monthly: v.plannedMonthly }).eq('id', id);
    if (error) throw friendly(error, 'Não foi possível salvar a meta.');
  },
  async deleteGoal(id) {
    const { error } = await getSupabase().from('goals').delete().eq('id', id);
    if (error) throw friendly(error, 'Não foi possível excluir a meta.');
  },
  async addMovement(goalId, kind, amount, occurredOn, note) {
    const { error } = await getSupabase().from('goal_movements').insert({ goal_id: goalId, kind, amount: validateAmount(amount), occurred_on: occurredOn, note: note?.trim().slice(0, 200) || null });
    if (error) throw friendly(error, 'Não foi possível registrar a movimentação.');
  },
  async deleteMovement(id) {
    const { error } = await getSupabase().from('goal_movements').delete().eq('id', id);
    if (error) throw friendly(error, 'Não foi possível excluir a movimentação.');
  },
  async budgets() {
    const { data, error } = await getSupabase().from('budgets').select('id, category, monthly_limit, alert_threshold').order('category');
    if (error) throw friendly(error, 'Não foi possível carregar os orçamentos.');
    return (data ?? []).map((b: any) => ({ id: b.id, category: b.category, monthlyLimit: Number(b.monthly_limit), alertThreshold: b.alert_threshold }));
  },
  async saveBudget(category, monthlyLimit, alertThreshold) {
    const limit = validateAmount(monthlyLimit);
    const threshold = Math.min(Math.max(Math.round(alertThreshold), 10), 100);
    const existing = await getSupabase().from('budgets').select('id').eq('category', category).maybeSingle();
    const { error } = existing.data
      ? await getSupabase().from('budgets').update({ monthly_limit: limit, alert_threshold: threshold }).eq('id', existing.data.id)
      : await getSupabase().from('budgets').insert({ category, monthly_limit: limit, alert_threshold: threshold });
    if (error) throw friendly(error, 'Não foi possível salvar o orçamento.');
  },
  async deleteBudget(id) {
    const { error } = await getSupabase().from('budgets').delete().eq('id', id);
    if (error) throw friendly(error, 'Não foi possível excluir o orçamento.');
  },
  async categories() {
    const { data, error } = await getSupabase().from('finance_categories').select('id, kind, name, is_active').order('name');
    if (error) throw friendly(error, 'Não foi possível carregar as categorias.');
    return (data ?? []).map((c: any) => ({ id: c.id, kind: c.kind, name: c.name, isActive: c.is_active }));
  },
  async createCategory(kind, name) {
    const { error } = await getSupabase().from('finance_categories').insert({ kind, name: validateCategoryName(name) });
    if (error) throw friendly(error, 'Não foi possível criar a categoria.');
  },
  async updateCategory(id, change) {
    const patch: Record<string, unknown> = {};
    if (change.name !== undefined) patch.name = validateCategoryName(change.name);
    if (change.isActive !== undefined) patch.is_active = change.isActive;
    const { error } = await getSupabase().from('finance_categories').update(patch).eq('id', id);
    if (error) throw friendly(error, 'Não foi possível salvar a categoria.');
  },
  async readAlerts() {
    const { data } = await getSupabase().from('alert_reads').select('alert_key');
    return new Set((data ?? []).map((r: any) => r.alert_key as string));
  },
  async markAlertRead(key) {
    await getSupabase().from('alert_reads').insert({ alert_key: key.slice(0, 200) });
  },
};
