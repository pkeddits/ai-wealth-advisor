import type { FinanceEntry, FinanceEntryInput } from '../../types';
import { monthRange } from '../../domain/finance';
import { newId } from '../demo/storage';
import type { FinanceService } from './types';
import { validateEntry } from './validation';

const KEY = 'aiwa.demo.finance.v1';

function load(): FinanceEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const save = (entries: FinanceEntry[]) => localStorage.setItem(KEY, JSON.stringify(entries));
const byRecent = (a: FinanceEntry, b: FinanceEntry) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt);

export const demoFinanceService: FinanceService = {
  async list(month) {
    const { from, to } = monthRange(month);
    return load().filter((e) => e.occurredOn >= from && e.occurredOn < to).sort(byRecent);
  },
  async create(input) {
    const now = new Date().toISOString();
    const entry: FinanceEntry = { id: newId(), ...validateEntry(input), source: 'manual', createdAt: now, updatedAt: now };
    save([...load(), entry]);
    return entry;
  },
  async update(id, input) {
    const entries = load();
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) throw new Error('Lançamento não encontrado.');
    entries[index] = { ...entries[index], ...validateEntry(input), updatedAt: new Date().toISOString() };
    save(entries);
    return entries[index];
  },
  async reclassify(id, change) {
    const entries = load();
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) throw new Error('Lançamento não encontrado.');
    entries[index] = { ...entries[index], category: change.category, updatedAt: new Date().toISOString() };
    save(entries);
    return entries[index];
  },
  async delete(id) {
    save(load().filter((e) => e.id !== id));
  },
};

export function clearDemoFinance() {
  localStorage.removeItem(KEY);
}

/** Lançamentos fictícios para o mês informado, somente no modo demonstração. */
export async function loadDemoFinanceSample(month: string) {
  const day = (d: number) => `${month}-${String(d).padStart(2, '0')}`;
  const sample: FinanceEntryInput[] = [
    { kind: 'receita', amount: 4200, category: 'salario', description: 'Salário', occurredOn: day(5) },
    { kind: 'receita', amount: 350, category: 'outros', description: 'Freela de edição de vídeo', occurredOn: day(18) },
    { kind: 'despesa', amount: 1350, category: 'moradia', description: 'Aluguel', occurredOn: day(6) },
    { kind: 'despesa', amount: 412.37, category: 'alimentacao', description: 'Mercado do mês', occurredOn: day(8) },
    { kind: 'despesa', amount: 89.9, category: 'alimentacao', description: 'Restaurante', occurredOn: day(14) },
    { kind: 'despesa', amount: 186.4, category: 'transporte', description: 'Bilhete único e aplicativo', occurredOn: day(10) },
    { kind: 'despesa', amount: 120, category: 'lazer', description: 'Cinema e streaming', occurredOn: day(16) },
    { kind: 'despesa', amount: 230, category: 'educacao', description: 'Curso online', occurredOn: day(12) },
    { kind: 'despesa', amount: 64.5, category: 'saude', description: 'Farmácia', occurredOn: day(20) },
  ];
  for (const entry of sample) await demoFinanceService.create(entry);
}
