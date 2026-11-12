import { HttpError } from '../http';
import { summarizeMonth, shiftMonth, monthRange } from '../../src/domain/finance';
import { computeHoldings, computeRealized, type TradeInput } from '../../src/domain/positions';
import { goalProgress, budgetUsage } from '../../src/domain/planning';
import { computeInsights, type Insight } from '../../src/domain/insights';
import { categoryLabel } from '../../src/domain/categories';

interface Ctx {
  supabaseUrl: string;
  supabaseKey: string;
  token: string;
}

/** Leitura com o token do próprio usuário: o RLS garante que só os dados dele são retornados. */
async function rows<T>(ctx: Ctx, path: string, fetcher: typeof fetch): Promise<T[]> {
  const res = await fetcher(`${ctx.supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, { headers: { apikey: ctx.supabaseKey, Authorization: `Bearer ${ctx.token}` } });
  if (!res.ok) throw new HttpError(502, 'Não foi possível montar o resumo financeiro.');
  return (await res.json()) as T[];
}

const monthName = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const round = (v: number) => Math.round(v * 100) / 100;
const clean = (v: string, max = 40) => v.replace(/[<>{}\[\]`\n\r]/g, ' ').slice(0, max).trim();

export function currentMonth(now = new Date()) {
  const local = new Date(now.getTime() - 3 * 3600_000);
  return local.toISOString().slice(0, 7);
}

export interface Snapshot {
  data: Record<string, unknown>;
  insights: Insight[];
}

export async function buildSnapshot(ctx: Ctx, fetcher: typeof fetch, month = currentMonth()): Promise<Snapshot> {
  const previous = shiftMonth(month, -1);
  const from = monthRange(previous).from;
  const to = monthRange(month).to;
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

  const [entries, categories, txs, imported, goals, movements, budgets, connections] = await Promise.all([
    rows<{ kind: 'receita' | 'despesa'; amount: number; category: string; occurred_on: string; status: 'posted' | 'pending'; flow: 'regular'; needs_review: boolean; source: string }>(ctx, `finance_entries?select=kind,amount,category,occurred_on,status,flow,needs_review,source&occurred_on=gte.${from}&occurred_on=lt.${to}`, fetcher),
    rows<{ id: string; name: string }>(ctx, 'finance_categories?select=id,name', fetcher),
    rows<{ portfolio_id: string; asset_id: string; type: 'compra' | 'venda'; quantity: number; price: number; fees: number; traded_on: string; created_at: string; asset: { symbol: string; asset_class: string } | null }>(ctx, 'transactions?select=portfolio_id,asset_id,type,quantity,price,fees,traded_on,created_at,asset:assets(symbol,asset_class)', fetcher),
    rows<{ type: string; balance: number | null; status: string | null }>(ctx, 'investment_positions?select=type,balance,status', fetcher),
    rows<{ id: string; name: string; target_amount: number; target_date: string | null }>(ctx, 'goals?select=id,name,target_amount,target_date', fetcher),
    rows<{ goal_id: string; kind: 'inicial' | 'aporte' | 'retirada'; amount: number; occurred_on: string }>(ctx, 'goal_movements?select=goal_id,kind,amount,occurred_on', fetcher),
    rows<{ category: string; monthly_limit: number; alert_threshold: number }>(ctx, 'budgets?select=category,monthly_limit,alert_threshold', fetcher),
    rows<{ id: string; institution_name: string; status: string; last_synced_at: string | null; last_sync_error: string | null }>(ctx, 'bank_connections?select=id,institution_name,status,last_synced_at,last_sync_error', fetcher),
  ]);

  const custom = new Map(categories.map((c) => [c.id, clean(c.name)]));
  const label = (slug: string) => categoryLabel(slug, custom);
  const asInput = entries.map((e) => ({ kind: e.kind, amount: Number(e.amount), category: e.category, occurredOn: e.occurred_on, status: e.status, flow: e.flow, needsReview: e.needs_review }));
  const cur = summarizeMonth(asInput, month);
  const prev = summarizeMonth(asInput, previous);
  const inMonth = entries.filter((e) => e.occurred_on.startsWith(month));

  const byPortfolio = new Map<string, TradeInput[]>();
  const meta = new Map<string, { symbol: string; cls: string }>();
  for (const t of txs) {
    if (t.asset) meta.set(t.asset_id, { symbol: t.asset.symbol, cls: t.asset.asset_class });
    byPortfolio.set(t.portfolio_id, [...(byPortfolio.get(t.portfolio_id) ?? []), { assetId: t.asset_id, type: t.type, quantity: Number(t.quantity), price: Number(t.price), fees: Number(t.fees), date: t.traded_on, createdAt: t.created_at }]);
  }
  const holdings = new Map<string, number>();
  let realized = 0;
  for (const trades of byPortfolio.values()) {
    for (const h of computeHoldings(trades)) holdings.set(h.assetId, (holdings.get(h.assetId) ?? 0) + h.investedValue);
    realized += computeRealized(trades);
  }
  const capital = [...holdings.values()].reduce((s, v) => s + v, 0);
  const positions = [...holdings.entries()]
    .map(([id, v]) => ({ symbol: meta.get(id)?.symbol ?? 'ativo', cls: meta.get(id)?.cls ?? 'outros', share: capital > 0 ? (v / capital) * 100 : 0 }))
    .sort((a, b) => b.share - a.share);

  const goalList = goals.map((g) => ({
    id: g.id,
    name: clean(g.name, 60),
    targetDate: g.target_date,
    progress: goalProgress(Number(g.target_amount), movements.filter((m) => m.goal_id === g.id).map((m) => ({ kind: m.kind, amount: Number(m.amount), occurredOn: m.occurred_on })), today, g.target_date),
    target: Number(g.target_amount),
  }));
  const usage = budgetUsage(budgets.map((b) => ({ category: b.category, monthlyLimit: Number(b.monthly_limit), alertThreshold: b.alert_threshold })), cur.expensesByCategory).map((u) => ({ ...u, label: label(u.category) }));
  const activeImported = imported.filter((i) => i.status !== 'TOTAL_WITHDRAWAL');

  const insights = computeInsights({
    month,
    monthLabel: monthName(month),
    previousLabel: monthName(previous),
    current: { expenses: cur.expenses, income: cur.income, byCategory: cur.expensesByCategory.map((c) => ({ ...c, label: label(c.category) })) },
    previous: entries.some((e) => e.occurred_on.startsWith(previous)) ? { expenses: prev.expenses, byCategory: prev.expensesByCategory } : null,
    budgets: usage,
    goals: goalList,
    holdings: positions.map((p) => ({ symbol: p.symbol, share: p.share })),
    pendingQuotes: 0,
    connections: connections.map((c) => ({ id: c.id, institution: clean(c.institution_name, 60), status: c.status, lastSyncedAt: c.last_synced_at, lastSyncError: c.last_sync_error ? 'falha na última sincronização' : null })),
    today,
  });

  const data = {
    periodo: { mes: monthName(month), mes_anterior: monthName(previous), hoje: today },
    financas_pessoais: inMonth.length
      ? {
          receitas: cur.income,
          despesas: cur.expenses,
          saldo_do_periodo: cur.net,
          observacao: 'saldo do período = receitas − despesas do mês; não é saldo bancário; transferências próprias, aplicações, faturas, pendentes e itens a revisar ficam fora',
          despesas_por_categoria: cur.expensesByCategory.slice(0, 8).map((c) => ({ categoria: label(c.category), valor: c.amount, pct_das_despesas: cur.expenses > 0 ? Math.round((c.amount / cur.expenses) * 100) : 0 })),
          mes_anterior: entries.some((e) => e.occurred_on.startsWith(previous)) ? { receitas: prev.income, despesas: prev.expenses, despesas_por_categoria: prev.expensesByCategory.slice(0, 8).map((c) => ({ categoria: label(c.category), valor: c.amount })) } : 'sem lançamentos',
          fora_dos_totais: { pendentes: cur.pending, a_revisar: cur.review, transferencias_aplicacoes_faturas: cur.neutral },
          origem: { manuais: inMonth.filter((e) => e.source === 'manual').length, importados: inMonth.filter((e) => e.source !== 'manual').length },
        }
      : 'sem lançamentos neste mês',
    orcamentos: usage.length ? usage.map((u) => ({ categoria: u.label, limite: u.limit, gasto: u.spent, restante: u.remaining, pct_usado: Math.round(u.pct), situacao: u.status })) : 'nenhum orçamento definido',
    metas: goalList.length
      ? goalList.map((g) => ({ nome: g.name, valor_alvo: g.target, guardado: g.progress.saved, restante: g.progress.remaining, pct: Math.round(g.progress.pct), data_desejada: g.targetDate, aporte_mensal_necessario: g.progress.neededPerMonth, ritmo_mensal_recente: g.progress.monthlyPace === null ? null : round(g.progress.monthlyPace), meses_no_ritmo_atual: g.progress.etaMonths }))
      : 'nenhuma meta cadastrada',
    investimentos_carteiras_manuais: byPortfolio.size
      ? { carteiras: byPortfolio.size, capital_aplicado: round(capital), resultado_realizado_vendas: round(realized), posicoes: positions.slice(0, 6).map((p) => ({ ativo: p.symbol, classe: p.cls, pct_do_capital: Math.round(p.share) })), observacao: 'valores pelo custo; valor de mercado e rentabilidade não incluídos neste resumo' }
      : 'nenhuma operação registrada',
    investimentos_importados_open_finance: activeImported.length
      ? { posicoes: activeImported.length, valor_informado_total: round(activeImported.reduce((s, i) => s + Number(i.balance ?? 0), 0)), sem_valor_informado: activeImported.filter((i) => i.balance === null).length, observacao: 'informado pelas instituições; não somar às carteiras manuais (podem ser os mesmos ativos)' }
      : 'nenhum investimento importado',
    conexoes_bancarias: connections.length ? connections.map((c) => ({ instituicao: clean(c.institution_name, 60), status: c.status, ultima_sincronizacao: c.last_synced_at?.slice(0, 10) ?? null, falha_recente: Boolean(c.last_sync_error) })) : 'nenhuma conexão',
  };
  return { data, insights };
}
