import type { FinanceEntry, Transaction } from '../../types';
import type { DemoPortfolioRecord, DemoState } from './storage';

/** Dados de exemplo locais e independentes por navegador. Nunca acessa o Supabase. */
const SEED_KEY = 'aiwa.demo.seed.v1';
const PORTFOLIO_KEY = 'aiwa.demo.v1';
const FINANCE_KEY = 'aiwa.demo.finance.v1';
const PLANNING_KEY = 'aiwa.demo.planning.v1';

function monthDate(offset: number, day: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const maxDay = offset === 0 ? now.getDate() : new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
}

function makeSeed() {
  const createdAt = new Date().toISOString();
  const portfolios: DemoPortfolioRecord[] = [
    { id: 'exemplo-principal', name: 'Carteira principal', description: 'Ações, fundos imobiliários e ETF (exemplo fictício)', riskProfile: 'moderado', createdAt, updatedAt: createdAt },
    { id: 'exemplo-reserva', name: 'Reserva de emergência', description: 'Reserva de liquidez (exemplo fictício)', riskProfile: 'conservador', createdAt, updatedAt: createdAt },
    { id: 'exemplo-longo-prazo', name: 'Longo prazo', description: 'Diversificação para longo prazo (exemplo fictício)', riskProfile: 'arrojado', createdAt, updatedAt: createdAt },
  ];

  const trades: Array<[string, string, 'compra' | 'venda', number, number, number, number]> = [
    ['exemplo-principal', 'demo-itub4', 'compra', 100, 31.2, -5, 4],
    ['exemplo-principal', 'demo-petr4', 'compra', 80, 39.5, -5, 12],
    ['exemplo-principal', 'demo-mxrf11', 'compra', 400, 9.6, -4, 3],
    ['exemplo-principal', 'demo-bova11', 'compra', 30, 124.1, -3, 15],
    ['exemplo-principal', 'demo-vale3', 'compra', 80, 57, -2, 8],
    ['exemplo-principal', 'demo-petr4', 'venda', 20, 40, -1, 18],
    ['exemplo-principal', 'demo-itub4', 'venda', 10, 35, 0, 8],
    ['exemplo-reserva', 'demo-selic29', 'compra', 1, 15000, -5, 6],
    ['exemplo-longo-prazo', 'demo-wege3', 'compra', 60, 47.8, -4, 11],
    ['exemplo-longo-prazo', 'demo-ivvb11', 'compra', 12, 322, -3, 9],
    ['exemplo-longo-prazo', 'demo-hglg11', 'compra', 8, 149.9, -2, 16],
  ];

  const transactions: Omit<Transaction, 'asset'>[] = trades.map(([portfolioId, assetId, type, quantity, price, month, day], i) => ({
    id: `exemplo-operacao-${i + 1}`,
    portfolioId,
    assetId,
    type,
    quantity,
    price,
    fees: 0,
    total: quantity * price,
    date: monthDate(month, day),
    notes: 'Operação fictícia para demonstração',
    createdAt,
    updatedAt: createdAt,
  }));
  const portfolioState: DemoState = { version: 1, portfolios, transactions };

  const finance: FinanceEntry[] = [];
  const incomes = [5000, 5100, 5100, 5200, 5200, 5300];
  const freelances = [600, 800, 450, 1000, 700, 850];
  const expenses: Array<[string, string, number, number]> = [
    ['moradia', 'Aluguel', 1700, 6],
    ['alimentacao', 'Compras no mercado', 790, 9],
    ['alimentacao', 'Restaurante', 180, 14],
    ['transporte', 'Transporte e aplicativos', 280, 11],
    ['educacao', 'Curso online', 220, 12],
    ['saude', 'Farmácia', 95, 10],
    ['lazer', 'Cinema e passeios', 310, 19],
    ['assinaturas', 'Streaming e serviços', 89.9, 8],
  ];
  let id = 0;
  function add(month: number, kind: 'receita' | 'despesa', category: string, description: string, amount: number, day: number) {
    const date = monthDate(month, day);
    finance.push({ id: `exemplo-financa-${++id}`, kind, category, description, amount, occurredOn: date, source: 'manual', createdAt, updatedAt: createdAt });
  }
  for (let i = 0; i < 6; i++) {
    const offset = i - 5;
    add(offset, 'receita', 'salario', 'Salário', incomes[i], 5);
    add(offset, 'receita', 'freelance', 'Projeto freelance', freelances[i], 13);
    for (const [category, description, amount, day] of expenses) {
      add(offset, 'despesa', category, description, Math.round((amount + (i - 2) * (category === 'alimentacao' ? 15 : 3)) * 100) / 100, day);
    }
  }

  const goalDefs = [
    { id: 'exemplo-meta-reserva', name: 'Reserva de emergência', kind: 'reserva', targetAmount: 30000, plannedMonthly: 700, saved: 9500 },
    { id: 'exemplo-meta-viagem', name: 'Viagem de férias', kind: 'viagem', targetAmount: 12000, plannedMonthly: 450, saved: 4200 },
    { id: 'exemplo-meta-notebook', name: 'Notebook novo', kind: 'outra', targetAmount: 8000, plannedMonthly: 300, saved: 2100 },
  ] as const;
  const planning = {
    goals: goalDefs.map((g) => ({ id: g.id, name: g.name, kind: g.kind, targetAmount: g.targetAmount, targetDate: monthDate(9, 15), plannedMonthly: g.plannedMonthly, createdAt })),
    movements: goalDefs.map((g) => ({ id: `${g.id}-inicial`, goalId: g.id, kind: 'inicial' as const, amount: g.saved, occurredOn: monthDate(-2, 5), note: 'Valor fictício inicial' })),
    budgets: [
      { id: 'exemplo-orc-moradia', category: 'moradia', monthlyLimit: 1900, alertThreshold: 80 },
      { id: 'exemplo-orc-alimentacao', category: 'alimentacao', monthlyLimit: 1200, alertThreshold: 80 },
      { id: 'exemplo-orc-transporte', category: 'transporte', monthlyLimit: 400, alertThreshold: 80 },
      { id: 'exemplo-orc-lazer', category: 'lazer', monthlyLimit: 450, alertThreshold: 80 },
      { id: 'exemplo-orc-assinaturas', category: 'assinaturas', monthlyLimit: 150, alertThreshold: 80 },
    ],
    categories: [],
    reads: [],
  };
  return { portfolioState, finance, planning };
}

function writeSeed() {
  const seed = makeSeed();
  // Uma escrita por chave. A marca é gravada por último para não sinalizar sucesso prematuramente.
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(seed.portfolioState));
  localStorage.setItem(FINANCE_KEY, JSON.stringify(seed.finance));
  localStorage.setItem(PLANNING_KEY, JSON.stringify(seed.planning));
  localStorage.setItem(SEED_KEY, 'initialized');
}

/** Nunca sobrescreve dados existentes nem dados que a pessoa decidiu apagar. */
export function initializeDemoData() {
  try {
    if (localStorage.getItem(SEED_KEY) !== null) return;
    if ([PORTFOLIO_KEY, FINANCE_KEY, PLANNING_KEY].some((key) => localStorage.getItem(key) !== null)) {
      localStorage.setItem(SEED_KEY, 'existing');
      return;
    }
    writeSeed();
  } catch {
    // Navegadores com armazenamento bloqueado continuam capazes de abrir a aplicação.
  }
}

/** Restauração solicitada pelo visitante. Não altera contas reais. */
export function restoreDemoData() {
  localStorage.removeItem(PORTFOLIO_KEY);
  localStorage.removeItem(FINANCE_KEY);
  localStorage.removeItem(PLANNING_KEY);
  writeSeed();
}
