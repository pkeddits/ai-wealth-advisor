import type { Asset } from '../../types';

/**
 * Catálogo de ativos da demonstração.
 * ATENÇÃO: os preços são FICTÍCIOS e fixos. Não representam cotações reais.
 */
const CREATED = '2026-11-01T00:00:00.000Z';

type CatalogEntry = Pick<Asset, 'id' | 'symbol' | 'name' | 'class' | 'sector'> & { demoPrice: number };

const ENTRIES: CatalogEntry[] = [
  { id: 'demo-petr4', symbol: 'PETR4', name: 'Petrobras PN', class: 'acoes', sector: 'Petróleo e gás', demoPrice: 37.8 },
  { id: 'demo-vale3', symbol: 'VALE3', name: 'Vale ON', class: 'acoes', sector: 'Mineração', demoPrice: 61.2 },
  { id: 'demo-itub4', symbol: 'ITUB4', name: 'Itaú Unibanco PN', class: 'acoes', sector: 'Bancos', demoPrice: 34.5 },
  { id: 'demo-wege3', symbol: 'WEGE3', name: 'WEG ON', class: 'acoes', sector: 'Bens industriais', demoPrice: 52.4 },
  { id: 'demo-mxrf11', symbol: 'MXRF11', name: 'Maxi Renda FII', class: 'fiis', sector: 'Papel', demoPrice: 9.85 },
  { id: 'demo-hglg11', symbol: 'HGLG11', name: 'CSHG Logística FII', class: 'fiis', sector: 'Logística', demoPrice: 158.3 },
  { id: 'demo-bova11', symbol: 'BOVA11', name: 'iShares Ibovespa ETF', class: 'etfs', sector: 'Índice', demoPrice: 128.6 },
  { id: 'demo-ivvb11', symbol: 'IVVB11', name: 'iShares S&P 500 ETF', class: 'internacional', sector: 'Índice', demoPrice: 345.0 },
  { id: 'demo-selic29', symbol: 'SELIC29', name: 'Tesouro Selic 2029', class: 'renda_fixa', sector: 'Título público', demoPrice: 15850.0 },
];

export const DEMO_ASSETS: Asset[] = ENTRIES.map(({ demoPrice: _price, ...a }) => ({
  ...a,
  country: 'BR',
  exchange: a.class === 'renda_fixa' ? 'Tesouro Direto' : 'B3',
  currency: 'BRL',
  isActive: true,
  createdAt: CREATED,
  updatedAt: CREATED,
}));

const PRICE_BY_ID = new Map(ENTRIES.map((e) => [e.id, e.demoPrice]));

export function findDemoAsset(id: string): Asset | undefined {
  return DEMO_ASSETS.find((a) => a.id === id);
}

/** Preço fictício fixo do ativo (0 se desconhecido). */
export function demoPriceOf(assetId: string): number {
  return PRICE_BY_ID.get(assetId) ?? 0;
}
