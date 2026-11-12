import { newId } from '../demo/storage';
import type { Budget, CustomCategory, Goal, GoalMovement, PlanningService } from './types';
import { validateAmount, validateCategoryName, validateGoal } from './validation';

const KEY = 'aiwa.demo.planning.v1';
interface State { goals: Omit<Goal, 'movements'>[]; movements: GoalMovement[]; budgets: Budget[]; categories: CustomCategory[]; reads: string[] }
const load = (): State => {
  try {
    return { goals: [], movements: [], budgets: [], categories: [], reads: [], ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { goals: [], movements: [], budgets: [], categories: [], reads: [] };
  }
};
const save = (s: State) => localStorage.setItem(KEY, JSON.stringify(s));
const today = () => new Date().toISOString().slice(0, 10);
const balance = (s: State, goalId: string) => s.movements.filter((m) => m.goalId === goalId).reduce((t, m) => t + (m.kind === 'retirada' ? -m.amount : m.amount), 0);

export function clearDemoPlanning() {
  localStorage.removeItem(KEY);
}

export const demoPlanningService: PlanningService = {
  async goals() {
    const s = load();
    return s.goals.map((g) => ({ ...g, movements: s.movements.filter((m) => m.goalId === g.id).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)) }));
  },
  async createGoal(input) {
    const v = validateGoal(input);
    const s = load();
    const id = newId();
    s.goals.push({ id, name: v.name, kind: v.kind, targetAmount: v.targetAmount, targetDate: v.targetDate, createdAt: new Date().toISOString() });
    if (v.initialAmount) s.movements.push({ id: newId(), goalId: id, kind: 'inicial', amount: v.initialAmount, occurredOn: today(), note: null });
    save(s);
  },
  async updateGoal(id, input) {
    const v = validateGoal(input);
    const s = load();
    s.goals = s.goals.map((g) => (g.id === id ? { ...g, name: v.name, kind: v.kind, targetAmount: v.targetAmount, targetDate: v.targetDate } : g));
    save(s);
  },
  async deleteGoal(id) {
    const s = load();
    s.goals = s.goals.filter((g) => g.id !== id);
    s.movements = s.movements.filter((m) => m.goalId !== id);
    save(s);
  },
  async addMovement(goalId, kind, amount, occurredOn, note) {
    const s = load();
    const v = validateAmount(amount);
    if (kind === 'retirada' && v > balance(s, goalId) + 0.001) throw new Error('A retirada é maior que o valor guardado na meta.');
    s.movements.push({ id: newId(), goalId, kind, amount: v, occurredOn, note: note?.trim() || null });
    save(s);
  },
  async deleteMovement(id) {
    const s = load();
    const target = s.movements.find((m) => m.id === id);
    if (target && target.kind !== 'retirada' && balance(s, target.goalId) - target.amount < -0.001) throw new Error('Excluir este aporte deixaria a meta com saldo negativo.');
    s.movements = s.movements.filter((m) => m.id !== id);
    save(s);
  },
  async budgets() {
    return load().budgets;
  },
  async saveBudget(category, monthlyLimit, alertThreshold) {
    const s = load();
    const limit = validateAmount(monthlyLimit);
    const existing = s.budgets.find((b) => b.category === category);
    if (existing) Object.assign(existing, { monthlyLimit: limit, alertThreshold });
    else s.budgets.push({ id: newId(), category, monthlyLimit: limit, alertThreshold });
    save(s);
  },
  async deleteBudget(id) {
    const s = load();
    s.budgets = s.budgets.filter((b) => b.id !== id);
    save(s);
  },
  async categories() {
    return load().categories;
  },
  async createCategory(kind, name) {
    const s = load();
    const v = validateCategoryName(name);
    if (s.categories.some((c) => c.kind === kind && c.name.toLowerCase() === v.toLowerCase())) throw new Error('Já existe uma categoria com esse nome.');
    s.categories.push({ id: crypto.randomUUID(), kind, name: v, isActive: true });
    save(s);
  },
  async updateCategory(id, change) {
    const s = load();
    s.categories = s.categories.map((c) => (c.id === id ? { ...c, ...(change.name !== undefined ? { name: validateCategoryName(change.name) } : {}), ...(change.isActive !== undefined ? { isActive: change.isActive } : {}) } : c));
    save(s);
  },
  async readAlerts() {
    return new Set(load().reads);
  },
  async markAlertRead(key) {
    const s = load();
    if (!s.reads.includes(key)) s.reads.push(key);
    save(s);
  },
};
