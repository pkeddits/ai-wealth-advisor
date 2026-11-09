/** Rótulos legíveis para valores internos exibidos na interface. */
const ASSET_CLASS: Record<string, string> = {
  acoes: 'Ações',
  fiis: 'FIIs',
  etfs: 'ETFs',
  renda_fixa: 'Renda fixa',
  cripto: 'Cripto',
  internacional: 'Internacional',
};
const RISK_PROFILE: Record<string, string> = { conservador: 'Conservador', moderado: 'Moderado', arrojado: 'Arrojado' };
const TRANSACTION_TYPE: Record<string, string> = { compra: 'Compra', venda: 'Venda' };

export const assetClassLabel = (v?: string) => (v ? ASSET_CLASS[v] ?? v : '—');
export const riskProfileLabel = (v?: string) => (v ? RISK_PROFILE[v] ?? v : '—');
export const transactionTypeLabel = (v?: string) => (v ? TRANSACTION_TYPE[v] ?? v : '—');
