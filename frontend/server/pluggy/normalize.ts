/**
 * Normalização dos dados da Pluggy. Regras conservadoras: quando a natureza de uma
 * movimentação é ambígua, ela é marcada para revisão em vez de virar receita ou despesa.
 */

export type Flow = 'regular' | 'transfer' | 'investment' | 'card_payment' | 'refund';
export type Category = 'alimentacao' | 'transporte' | 'moradia' | 'lazer' | 'saude' | 'educacao' | 'salario' | 'outros';

export interface PluggyTransaction {
  id: string;
  description?: string | null;
  amount: number;
  date: string;
  type?: 'DEBIT' | 'CREDIT' | null;
  status?: 'PENDING' | 'POSTED' | null;
  category?: string | null;
  operationType?: string | null;
  paymentData?: {
    payer?: { documentNumber?: { value?: string | null } | null } | null;
    receiver?: { documentNumber?: { value?: string | null } | null } | null;
  } | null;
}

export interface NormalizedEntry {
  external_id: string;
  kind: 'receita' | 'despesa';
  amount: number;
  category: Category;
  description: string;
  occurred_on: string;
  status: 'posted' | 'pending';
  flow: Flow;
  needs_review: boolean;
}

/** Datas da Pluggy são UTC; a data do lançamento é a do horário de Brasília (UTC−3). */
export function brazilDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso.slice(0, 10);
  return new Date(time - 3 * 3600_000).toISOString().slice(0, 10);
}

const CATEGORY_RULES: [RegExp, Category][] = [
  [/salar|payroll|folha/i, 'salario'],
  [/food|grocer|supermarket|restaurant|delivery|aliment|mercado|padaria|ifood/i, 'alimentacao'],
  [/transport|taxi|uber|99|fuel|gas station|parking|toll|combust|estacion|onibus|metro/i, 'transporte'],
  [/hous|rent|utilit|electric|water|telecom|internet|condo|aluguel|condom|energia|luz/i, 'moradia'],
  [/leisure|entertain|stream|travel|hotel|cinema|netflix|spotify|lazer|viage/i, 'lazer'],
  [/health|pharma|drug|hospital|clinic|gym|saude|farmac|academ/i, 'saude'],
  [/educat|school|course|book|escola|curso|faculdade|livr/i, 'educacao'],
];

function categoryOf(t: PluggyTransaction): Category {
  const text = `${t.category ?? ''} ${t.description ?? ''}`;
  for (const [pattern, category] of CATEGORY_RULES) if (pattern.test(text)) return category;
  return 'outros';
}

const onlyDigits = (v?: string | null) => (v ?? '').replace(/\D/g, '');
const TRANSFER_OPS = new Set(['PIX', 'TED', 'DOC', 'TRANSFERENCIA_MESMA_INSTITUICAO']);
const INVESTMENT_OPS = new Set(['RESGATE_APLIC_FINANCEIRA']);
const INVESTMENT_TEXT = /aplica[cç]|resgate|tesouro|\bcdb\b|\blci\b|\blca\b|invest|poupan|cofrinho|caixinha/i;
const CARD_BILL_TEXT = /fatura|cart[aã]o de cr[eé]dito|pagamento cart|pag(to)? cart/i;
const REFUND_TEXT = /estorno|reembolso|chargeback|devolu/i;

/**
 * @param accountKind tipo da conta de origem (BANK ou CREDIT)
 * @param hasCardAccount se a mesma conexão traz um cartão de crédito (compras já importadas)
 */
export function classifyTransaction(t: PluggyTransaction, accountKind: 'BANK' | 'CREDIT', hasCardAccount: boolean): NormalizedEntry | null {
  const amount = Math.round(Math.abs(Number(t.amount)) * 100) / 100;
  if (!Number.isFinite(amount) || amount === 0) return null;
  const outflow = t.type ? t.type === 'DEBIT' : accountKind === 'CREDIT' ? t.amount > 0 : t.amount < 0;
  const op = (t.operationType ?? '').toUpperCase();
  const text = `${t.description ?? ''} ${t.category ?? ''}`;
  const base = {
    external_id: t.id,
    amount,
    description: (t.description ?? '').trim().slice(0, 200) || 'Movimentação',
    occurred_on: brazilDate(t.date),
    status: t.status === 'PENDING' ? ('pending' as const) : ('posted' as const),
  };
  const entry = (kind: 'receita' | 'despesa', flow: Flow, category: Category, needsReview = false): NormalizedEntry => ({ ...base, kind, flow, category, needs_review: needsReview });

  if (accountKind === 'CREDIT') {
    if (outflow) return entry('despesa', 'regular', categoryOf(t));
    if (op === 'PAGAMENTO_FATURA' || /pagamento|pagto/i.test(text)) return entry('receita', 'card_payment', 'outros');
    if (op === 'ESTORNO' || op === 'CASHBACK' || REFUND_TEXT.test(text)) return entry('receita', 'refund', categoryOf(t));
    return entry('receita', 'regular', 'outros', true);
  }

  if (op === 'PAGAMENTO_FATURA' || (outflow && CARD_BILL_TEXT.test(text))) {
    return entry(outflow ? 'despesa' : 'receita', 'card_payment', 'outros', !hasCardAccount);
  }
  if (INVESTMENT_OPS.has(op) || INVESTMENT_TEXT.test(text) || /investment/i.test(t.category ?? '')) {
    if (op === 'RENDIMENTO_APLIC_FINANCEIRA') return entry('receita', 'regular', 'outros');
    return entry(outflow ? 'despesa' : 'receita', 'investment', 'outros');
  }
  if (!outflow && REFUND_TEXT.test(text)) return entry('receita', 'refund', categoryOf(t));
  if (!outflow && (op === 'FOLHA_PAGAMENTO' || op === 'PORTABILIDADE_SALARIO' || /salar/i.test(text))) return entry('receita', 'regular', 'salario');

  if (TRANSFER_OPS.has(op) || /\bpix\b|\bted\b|\bdoc\b|transf/i.test(text)) {
    const payer = onlyDigits(t.paymentData?.payer?.documentNumber?.value);
    const receiver = onlyDigits(t.paymentData?.receiver?.documentNumber?.value);
    if (payer && payer === receiver) return entry(outflow ? 'despesa' : 'receita', 'transfer', 'outros');
    const category = categoryOf(t);
    return entry(outflow ? 'despesa' : 'receita', 'regular', outflow ? category : category === 'salario' ? 'salario' : 'outros', category === 'outros');
  }

  const category = categoryOf(t);
  return entry(outflow ? 'despesa' : 'receita', 'regular', outflow ? category : category === 'salario' ? 'salario' : 'outros');
}

export interface PluggyAccount {
  id: string;
  type: 'BANK' | 'CREDIT' | string;
  subtype?: string | null;
  name?: string | null;
  marketingName?: string | null;
  number?: string | null;
  balance?: number | null;
  currencyCode?: string | null;
  creditData?: { creditLimit?: number | null } | null;
}

const ACCOUNT_LABELS: Record<string, string> = {
  CHECKING_ACCOUNT: 'Conta corrente',
  SAVINGS_ACCOUNT: 'Poupança',
  CREDIT_CARD: 'Cartão de crédito',
};

export function normalizeAccount(a: PluggyAccount) {
  const kind = a.type === 'CREDIT' ? 'CREDIT' : 'BANK';
  const digits = onlyDigits(a.number);
  const label = a.marketingName || ACCOUNT_LABELS[a.subtype ?? ''] || a.name || (kind === 'CREDIT' ? 'Cartão de crédito' : 'Conta');
  return {
    external_id: a.id,
    kind,
    subtype: a.subtype ?? null,
    name: label.trim().slice(0, 120),
    number_last4: digits ? digits.slice(-4) : null,
    currency: (a.currencyCode ?? 'BRL').slice(0, 3).toUpperCase(),
    balance: typeof a.balance === 'number' ? Math.round(a.balance * 100) / 100 : null,
    credit_limit: typeof a.creditData?.creditLimit === 'number' ? a.creditData.creditLimit : null,
  };
}

export interface PluggyInvestment {
  id: string;
  name?: string | null;
  code?: string | null;
  isin?: string | null;
  type?: string | null;
  subtype?: string | null;
  status?: string | null;
  currencyCode?: string | null;
  quantity?: number | null;
  value?: number | null;
  balance?: number | null;
  amountOriginal?: number | null;
  issuer?: string | null;
  dueDate?: string | null;
  date?: string | null;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Mantém ausentes como null: não deriva custo, preço médio nem rentabilidade. */
export function normalizeInvestment(i: PluggyInvestment) {
  return {
    external_id: i.id,
    name: (i.name ?? i.code ?? 'Investimento').trim().slice(0, 200),
    code: i.code ? i.code.trim().slice(0, 40) : null,
    isin: i.isin ? i.isin.trim().slice(0, 20) : null,
    type: (i.type ?? 'OTHER').slice(0, 40),
    subtype: i.subtype ? i.subtype.slice(0, 40) : null,
    status: i.status ? i.status.slice(0, 30) : null,
    currency: (i.currencyCode ?? 'BRL').slice(0, 3).toUpperCase(),
    quantity: num(i.quantity),
    unit_value: num(i.value),
    balance: num(i.balance),
    amount_original: num(i.amountOriginal),
    issuer: i.issuer ? i.issuer.slice(0, 200) : null,
    due_date: i.dueDate ? i.dueDate.slice(0, 10) : null,
    reported_at: i.date ?? null,
  };
}

export interface PluggyInvestmentTransaction {
  id: string;
  type?: string | null;
  quantity?: number | null;
  value?: number | null;
  amount?: number | null;
  date?: string | null;
  tradeDate?: string | null;
}

const MOVEMENT_TYPES = new Set(['BUY', 'SELL', 'TAX', 'TRANSFER', 'INTEREST', 'AMORTIZATION']);

export function normalizeMovement(m: PluggyInvestmentTransaction) {
  const date = m.tradeDate ?? m.date;
  return {
    external_id: m.id,
    type: MOVEMENT_TYPES.has((m.type ?? '').toUpperCase()) ? (m.type as string).toUpperCase() : 'OTHER',
    quantity: num(m.quantity),
    unit_value: num(m.value),
    amount: num(m.amount),
    traded_on: date ? brazilDate(date) : null,
  };
}
