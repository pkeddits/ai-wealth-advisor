// Verificação dos cálculos de carteira. Rodar: npm run check:domain
import { computeHoldings, computeRealized, valueHoldings, summarize, OversellError } from '../src/domain/positions';
import { summarizeMonth, monthRange, shiftMonth } from '../src/domain/finance';
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
// 8) Resultado realizado: compra 10 a 10 (+2 de taxa) e 10 a 20 -> PM 15,10; venda de 5 a 30 com taxa 1
eq('realizado', computeRealized([t('A','compra',10,10,'2026-01-01',2), t('A','compra',10,20,'2026-01-02'), t('A','venda',5,30,'2026-01-03',1)]), 5 * 30 - 1 - 15.1 * 5);
eq('realizado sem vendas', computeRealized([t('A','compra',10,10,'2026-01-01')]), 0);
eq('prejuízo realizado', computeRealized([t('A','compra',10,10,'2026-01-01'), t('A','venda',10,8,'2026-01-02')]), -20);
// 9) Finanças do mês: só o mês pedido, saldo = receitas - despesas, centavos sem erro de ponto flutuante
const f = (kind: 'receita'|'despesa', amount: number, category: string, occurredOn: string) => ({ kind, amount, category, occurredOn });
const m = summarizeMonth([f('receita', 3500, 'salario', '2026-11-05'), f('despesa', 0.1, 'alimentacao', '2026-11-06'), f('despesa', 0.2, 'alimentacao', '2026-11-06'), f('despesa', 1200, 'moradia', '2026-11-10'), f('despesa', 999, 'lazer', '2026-10-31'), f('receita', 50, 'outros', '2026-12-01')], '2026-11');
eq('receitas do mês', m.income, 3500); eq('despesas do mês', m.expenses, 1200.3); eq('saldo do período', m.net, 2299.7);
eq('categorias', m.expensesByCategory.length, 2); eq('maior categoria', m.expensesByCategory[0].amount, 1200); eq('centavos somados', m.expensesByCategory[1].amount, 0.3);
eq('dias com lançamentos', m.byDay.length, 3);
if (monthRange('2026-12').to !== '2027-01-01' || shiftMonth('2026-01', -1) !== '2025-12' || shiftMonth('2026-11', 2) !== '2027-01') { fail++; console.log('FALHOU virada de mês/ano'); } else ok++;
console.log(`${ok} verificações OK, ${fail} falhas`);
if (fail > 0) process.exit(1);
