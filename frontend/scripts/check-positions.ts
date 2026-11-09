// Verificação dos cálculos de carteira. Rodar: npm run check:domain
import { computeHoldings, valueHoldings, summarize, OversellError } from '../src/domain/positions';
let ok = 0, fail = 0;
const eq = (name: string, a: number, b: number) => { if (Math.abs(a - b) < 1e-6) ok++; else { fail++; console.log('FALHOU', name, a, '!=', b); } };
const t = (assetId: string, type: 'compra'|'venda', quantity: number, price: number, date: string, fees = 0, createdAt = date) => ({ assetId, type, quantity, price, fees, date, createdAt });

// 1) Duas compras: preço médio ponderado com taxas
let h = computeHoldings([t('A','compra',10,10,'2026-01-01',2), t('A','compra',10,20,'2026-01-02')]);
eq('qtd', h[0].quantity, 20); eq('custo', h[0].investedValue, 302); eq('PM', h[0].averagePrice, 15.1);
// 2) Venda parcial mantém PM e reduz custo proporcionalmente
h = computeHoldings([t('A','compra',10,10,'2026-01-01'), t('A','compra',10,20,'2026-01-02'), t('A','venda',5,30,'2026-01-03')]);
eq('qtd após venda', h[0].quantity, 15); eq('PM após venda', h[0].averagePrice, 15); eq('custo após venda', h[0].investedValue, 225);
// 3) Venda total remove a posição
h = computeHoldings([t('A','compra',10,10,'2026-01-01'), t('A','venda',10,12,'2026-01-02')]);
eq('posição zerada some', h.length, 0);
// 4) Ordem cronológica independe da ordem de inserção
h = computeHoldings([t('A','venda',5,12,'2026-01-05'), t('A','compra',10,10,'2026-01-01')]);
eq('ordem cronológica', h[0].quantity, 5);
// 5) Venda acima do saldo (inclusive venda datada antes da compra) é rejeitada
for (const trades of [[t('A','compra',10,10,'2026-01-01'), t('A','venda',11,10,'2026-01-02')], [t('A','venda',5,10,'2026-01-01'), t('A','compra',10,10,'2026-01-02')]]) {
  try { computeHoldings(trades as any); fail++; console.log('FALHOU: deveria rejeitar venda'); } catch (e) { e instanceof OversellError ? ok++ : (fail++, console.log('erro errado', e)); }
}
// 6) Valorização, alocação e totais
const v = valueHoldings(computeHoldings([t('A','compra',10,10,'2026-01-01'), t('B','compra',5,20,'2026-01-01')]), (id) => (id === 'A' ? 12 : 18));
eq('valor A', v[0].currentValue, 120); eq('ganho% A', v[0].unrealizedGainPct, 20); eq('ganho% B', v[1].unrealizedGainPct, -10);
eq('alocação soma 100', v[0].allocation + v[1].allocation, 100); eq('alocação A', v[0].allocation, 120 / 210 * 100);
const s = summarize(v); eq('total', s.totalValue, 210); eq('investido', s.totalInvested, 200); eq('retorno %', s.totalReturnPct, 5);
// 7) Carteira vazia não divide por zero
const e = summarize(valueHoldings([], () => 0)); eq('vazio', e.totalReturnPct, 0);
console.log(`${ok} verificações OK, ${fail} falhas`);
if (fail > 0) process.exit(1);
