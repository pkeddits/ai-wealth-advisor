import type { BudgetUsage, GoalProgress } from './planning';

export type Severity = 'info' | 'warning' | 'critical' | 'success';

export interface Insight {
  key: string;
  kind: 'orcamento' | 'meta' | 'investimento' | 'integracao' | 'gastos';
  severity: Severity;
  title: string;
  body: string;
  /** Período ou conjunto de dados considerado. */
  basis: string;
}

export interface InsightInput {
  month: string;
  monthLabel: string;
  previousLabel: string;
  current: { expenses: number; income: number; byCategory: { category: string; label: string; amount: number }[] };
  previous: { expenses: number; byCategory: { category: string; amount: number }[] } | null;
  budgets: (BudgetUsage & { label: string })[];
  goals: { id: string; name: string; targetDate: string | null; progress: GoalProgress }[];
  holdings: { symbol: string; share: number }[];
  pendingQuotes: number;
  connections: { id: string; institution: string; status: string; lastSyncedAt: string | null; lastSyncError: string | null }[];
  today: string;
  concentrationThreshold?: number;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Regras determinísticas. Nada aqui depende de IA. */
export function computeInsights(input: InsightInput): Insight[] {
  const out: Insight[] = [];
  const limit = input.concentrationThreshold ?? 40;

  for (const b of input.budgets) {
    if (b.status === 'over') out.push({ key: `budget:${b.category}:${input.month}:over`, kind: 'orcamento', severity: 'critical', title: `Orçamento de ${b.label} ultrapassado`, body: `${brl(b.spent)} de ${brl(b.limit)} (${Math.round(b.pct)}%).`, basis: input.monthLabel });
    else if (b.status === 'warning') out.push({ key: `budget:${b.category}:${input.month}:warning`, kind: 'orcamento', severity: 'warning', title: `${b.label} perto do limite`, body: `${Math.round(b.pct)}% usado; restam ${brl(b.remaining)}.`, basis: input.monthLabel });
  }

  for (const g of input.goals) {
    if (g.progress.reached) out.push({ key: `goal:${g.id}:reached`, kind: 'meta', severity: 'success', title: `Meta "${g.name}" alcançada`, body: `${brl(g.progress.saved)} guardados.`, basis: 'Aportes registrados na meta' });
    else if (g.targetDate && g.progress.monthsLeft !== null && g.progress.monthsLeft <= 2) {
      out.push({ key: `goal:${g.id}:deadline:${g.targetDate}`, kind: 'meta', severity: 'warning', title: `Prazo da meta "${g.name}" se aproximando`, body: `Faltam ${brl(g.progress.remaining)} até ${g.targetDate.split('-').reverse().join('/')}.`, basis: 'Aportes registrados na meta' });
    }
  }

  const top = input.holdings[0];
  if (top && input.holdings.length > 0 && top.share >= limit) {
    out.push({ key: `concentration:${top.symbol}:${Math.round(top.share / 5) * 5}`, kind: 'investimento', severity: 'warning', title: `Concentração elevada em ${top.symbol}`, body: `${Math.round(top.share)}% do capital aplicado nas carteiras manuais está em um único ativo.`, basis: 'Carteiras manuais, pelo custo' });
  }
  if (input.pendingQuotes > 0) {
    out.push({ key: `quotes:pending:${input.today}`, kind: 'investimento', severity: 'info', title: 'Cotação indisponível', body: `${input.pendingQuotes} ${input.pendingQuotes === 1 ? 'ativo está' : 'ativos estão'} sem preço de mercado; o patrimônio a mercado não é exibido.`, basis: 'Carteiras manuais' });
  }

  for (const c of input.connections) {
    if (['LOGIN_ERROR', 'WAITING_USER_INPUT', 'WAITING_USER_ACTION'].includes(c.status)) {
      out.push({ key: `connection:${c.id}:reauth`, kind: 'integracao', severity: 'critical', title: `${c.institution} precisa de nova autorização`, body: 'Reconecte em Configurações → Integrações.', basis: 'Status da conexão' });
    } else if (c.lastSyncError) {
      out.push({ key: `connection:${c.id}:error:${(c.lastSyncedAt ?? '').slice(0, 10)}`, kind: 'integracao', severity: 'warning', title: `Falha ao sincronizar ${c.institution}`, body: c.lastSyncError, basis: 'Última sincronização' });
    } else if (c.lastSyncedAt && (Date.parse(input.today) - Date.parse(c.lastSyncedAt)) / 86400_000 > 7) {
      out.push({ key: `connection:${c.id}:stale:${c.lastSyncedAt.slice(0, 10)}`, kind: 'integracao', severity: 'info', title: `Dados de ${c.institution} desatualizados`, body: `Última sincronização em ${c.lastSyncedAt.slice(0, 10).split('-').reverse().join('/')}.`, basis: 'Status da conexão' });
    }
  }

  if (input.previous) {
    const prevBy = new Map(input.previous.byCategory.map((c) => [c.category, c.amount]));
    const increases = input.current.byCategory
      .map((c) => ({ ...c, delta: c.amount - (prevBy.get(c.category) ?? 0) }))
      .filter((c) => c.delta >= 50 && c.delta >= (prevBy.get(c.category) ?? 0) * 0.2)
      .sort((a, b) => b.delta - a.delta);
    if (increases[0]) {
      out.push({ key: `spending:${increases[0].category}:${input.month}`, kind: 'gastos', severity: 'info', title: `Gastos com ${increases[0].label} aumentaram`, body: `${brl(increases[0].amount)}, ${brl(increases[0].delta)} a mais que em ${input.previousLabel}.`, basis: `${input.monthLabel} comparado a ${input.previousLabel}` });
    }
  }
  if (input.current.byCategory[0] && input.current.expenses > 0) {
    const c = input.current.byCategory[0];
    out.push({ key: `top:${c.category}:${input.month}`, kind: 'gastos', severity: 'info', title: `${c.label} foi a maior despesa`, body: `${brl(c.amount)}, ${Math.round((c.amount / input.current.expenses) * 100)}% das despesas.`, basis: input.monthLabel });
  }
  return out;
}
