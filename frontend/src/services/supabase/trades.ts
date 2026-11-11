import { computeHoldings, OversellError } from '../../domain/positions';
import type { Transaction } from '../../types';
import { toTrade } from './mappers';

export interface TradeDraft {
  portfolioId?: string;
  assetId?: string;
  type?: string;
  quantity?: number | string;
  price?: number | string;
  fees?: number | string;
  date?: string;
  notes?: string;
}

export interface ValidTrade {
  portfolioId: string;
  assetId: string;
  type: 'compra' | 'venda';
  quantity: number;
  price: number;
  fees: number;
  date: string;
  notes?: string;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function validateTrade(data: TradeDraft): ValidTrade {
  if (!data.portfolioId) throw new Error('Carteira não encontrada.');
  if (!data.assetId) throw new Error('Selecione um ativo.');
  if (data.type !== 'compra' && data.type !== 'venda') throw new Error('Tipo deve ser compra ou venda.');
  const quantity = Number(data.quantity);
  const price = Number(data.price);
  const fees = Number(data.fees ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade maior que zero.');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Informe um preço maior que zero.');
  if (!Number.isFinite(fees) || fees < 0) throw new Error('Taxas não podem ser negativas.');
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('Informe uma data válida.');
  if (data.date > localToday()) throw new Error('A data não pode estar no futuro.');
  const notes = data.notes?.trim() || undefined;
  if (notes && notes.length > 500) throw new Error('Observações devem ter no máximo 500 caracteres.');
  return { portfolioId: data.portfolioId, assetId: data.assetId, type: data.type, quantity, price, fees, date: data.date, notes };
}

/** Recusa com mensagem clara uma venda (ou exclusão) que deixaria saldo negativo. */
export function assertHoldings(transactions: Transaction[], symbolOf: (assetId: string) => string) {
  try {
    computeHoldings(transactions.map(toTrade));
  } catch (e) {
    if (e instanceof OversellError) {
      const date = e.date.split('-').reverse().join('/');
      throw new Error(`Venda maior que a quantidade de ${symbolOf(e.assetId)} em carteira (${e.available} disponível em ${date}).`);
    }
    throw e;
  }
}
