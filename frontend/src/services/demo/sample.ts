import { demoPortfolioService } from './portfolio';
import { recordTrade } from './core';

/** Cria uma carteira de exemplo com compras e uma venda (dados fictícios). */
export async function loadDemoSample(): Promise<string> {
  const p = await demoPortfolioService.create({
    name: 'Carteira de exemplo',
    description: 'Dados fictícios para demonstração',
    riskProfile: 'moderado',
  });
  const trades: Array<[string, 'compra' | 'venda', number, number, string]> = [
    ['demo-itub4', 'compra', 100, 31.2, '2026-08-04'],
    ['demo-petr4', 'compra', 80, 39.5, '2026-08-12'],
    ['demo-mxrf11', 'compra', 300, 9.6, '2026-09-02'],
    ['demo-bova11', 'compra', 20, 124.1, '2026-09-15'],
    ['demo-selic29', 'compra', 1, 15420, '2026-10-01'],
    ['demo-petr4', 'venda', 30, 38.9, '2026-10-20'],
  ];
  for (const [assetId, type, quantity, price, date] of trades) {
    recordTrade({ portfolioId: p.id, assetId, type, quantity, price, fees: 0, date });
  }
  return p.id;
}
