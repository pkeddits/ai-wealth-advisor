import type { GoalInput } from './types';

const money = (v: unknown) => Math.round(Number(v) * 100) / 100;

export function validateGoal(input: GoalInput): GoalInput {
  const name = input.name?.trim() ?? '';
  if (!name || name.length > 80) throw new Error('Dê um nome de até 80 caracteres para a meta.');
  const targetAmount = money(input.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) throw new Error('Informe um valor-alvo maior que zero.');
  const initialAmount = input.initialAmount ? money(input.initialAmount) : 0;
  if (!Number.isFinite(initialAmount) || initialAmount < 0) throw new Error('O valor já guardado não pode ser negativo.');
  if (input.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) throw new Error('Data desejada inválida.');
  return { name, kind: input.kind, targetAmount, targetDate: input.targetDate || null, initialAmount };
}

export function validateAmount(amount: number) {
  const v = money(amount);
  if (!Number.isFinite(v) || v <= 0) throw new Error('Informe um valor maior que zero.');
  return v;
}

export function validateCategoryName(name: string) {
  const v = name.trim();
  if (!v || v.length > 40) throw new Error('O nome deve ter entre 1 e 40 caracteres.');
  return v;
}
