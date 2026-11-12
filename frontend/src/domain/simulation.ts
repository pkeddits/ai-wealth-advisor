/**
 * Simulações com juros compostos. Convenção: a taxa anual informada é efetiva e é convertida
 * para a taxa mensal equivalente, (1 + anual)^(1/12) − 1. Os aportes ocorrem ao fim de cada mês,
 * depois do rendimento do mês. Impostos, taxas e inflação não são considerados.
 */

export type RatePeriod = 'mensal' | 'anual';

export interface SimulationInput {
  initial: number;
  monthly: number;
  months: number;
  ratePct: number;
  ratePeriod: RatePeriod;
}

export interface SimulationPoint {
  month: number;
  invested: number;
  value: number;
}

export interface SimulationResult {
  monthlyRate: number;
  points: SimulationPoint[];
  totalInvested: number;
  finalValue: number;
  earnings: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function monthlyRateFrom(ratePct: number, period: RatePeriod): number {
  const r = ratePct / 100;
  return period === 'mensal' ? r : Math.pow(1 + r, 1 / 12) - 1;
}

export function validateSimulation(input: SimulationInput): string | null {
  const { initial, monthly, months, ratePct } = input;
  if (![initial, monthly, months, ratePct].every(Number.isFinite)) return 'Preencha todos os campos com números.';
  if (initial < 0 || monthly < 0) return 'Valores não podem ser negativos.';
  if (!Number.isInteger(months) || months < 1 || months > 600) return 'O prazo deve ficar entre 1 e 600 meses.';
  if (ratePct < 0 || ratePct > (input.ratePeriod === 'mensal' ? 10 : 100)) return 'Taxa fora do intervalo aceito.';
  return null;
}

export function simulate(input: SimulationInput): SimulationResult {
  const error = validateSimulation(input);
  if (error) throw new Error(error);
  const r = monthlyRateFrom(input.ratePct, input.ratePeriod);
  let value = input.initial;
  let invested = input.initial;
  const points: SimulationPoint[] = [{ month: 0, invested: round2(invested), value: round2(value) }];
  for (let m = 1; m <= input.months; m++) {
    value = value * (1 + r) + input.monthly;
    invested += input.monthly;
    points.push({ month: m, invested: round2(invested), value: round2(value) });
  }
  return { monthlyRate: r, points, totalInvested: round2(invested), finalValue: round2(value), earnings: round2(value - invested) };
}

/** Aporte mensal necessário para sair de `current` e chegar a `target` em `months` meses. */
export function monthlyNeeded(target: number, current: number, months: number, monthlyRate: number): number {
  if (months < 1) return Math.max(target - current, 0);
  const growth = Math.pow(1 + monthlyRate, months);
  const gap = target - current * growth;
  if (gap <= 0) return 0;
  return round2(monthlyRate === 0 ? gap / months : (gap * monthlyRate) / (growth - 1));
}

/** Meses até alcançar o alvo no ritmo informado; null se não alcança em 100 anos. */
export function monthsToTarget(current: number, monthly: number, target: number, monthlyRate: number): number | null {
  if (current >= target) return 0;
  let value = current;
  for (let m = 1; m <= 1200; m++) {
    value = value * (1 + monthlyRate) + monthly;
    if (value >= target - 0.005) return m;
  }
  return null;
}
