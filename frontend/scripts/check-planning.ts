// Simulações, metas, orçamentos e regras de alerta. Rodar: npm run check:planning
import { simulate, monthlyRateFrom, monthlyNeeded, monthsToTarget, validateSimulation } from '../src/domain/simulation';
import { goalProgress, budgetUsage } from '../src/domain/planning';
import { computeInsights } from '../src/domain/insights';

let ok = 0, fail = 0;
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const check = (name: string, cond: boolean, detail = '') => { if (cond) ok++; else { fail++; console.log('FALHOU', name, detail); } };

check('taxa anual 12% → mensal efetiva 0,9489%', near(monthlyRateFrom(12, 'anual'), 0.0094888, 1e-6));
check('taxa mensal 1% mantida', monthlyRateFrom(1, 'mensal') === 0.01);
check('12 meses a 0,9489% a.m. = 12% a.a. efetivo', near(Math.pow(1 + monthlyRateFrom(12, 'anual'), 12) - 1, 0.12, 1e-9));
let r = simulate({ initial: 1000, monthly: 0, months: 12, ratePct: 1, ratePeriod: 'mensal' });
check('juros compostos sobre valor inicial', near(r.finalValue, 1126.83), String(r.finalValue));
r = simulate({ initial: 0, monthly: 100, months: 12, ratePct: 1, ratePeriod: 'mensal' });
check('aportes mensais (valor futuro de série postecipada)', near(r.finalValue, 1268.25), String(r.finalValue));
check('total aportado e rendimento', r.totalInvested === 1200 && near(r.earnings, 68.25));
r = simulate({ initial: 500, monthly: 200, months: 24, ratePct: 0, ratePeriod: 'anual' });
check('taxa zero: só soma aportes', r.finalValue === 5300 && r.earnings === 0);
r = simulate({ initial: 0, monthly: 0, months: 6, ratePct: 10, ratePeriod: 'anual' });
check('tudo zerado: zero', r.finalValue === 0 && r.points.length === 7);
check('entrada inválida: prazo zero', validateSimulation({ initial: 0, monthly: 10, months: 0, ratePct: 1, ratePeriod: 'mensal' }) !== null);
check('entrada inválida: valor negativo', validateSimulation({ initial: -1, monthly: 10, months: 12, ratePct: 1, ratePeriod: 'mensal' }) !== null);
check('entrada inválida: texto', validateSimulation({ initial: NaN, monthly: 10, months: 12, ratePct: 1, ratePeriod: 'mensal' }) !== null);
let threw = false; try { simulate({ initial: 0, monthly: 0, months: 601, ratePct: 1, ratePeriod: 'mensal' }); } catch { threw = true; }
check('simulate recusa prazo acima do limite', threw);
check('aporte necessário sem juros', monthlyNeeded(6000, 1200, 12, 0) === 400);
check('aporte necessário com juros (PMT)', near(monthlyNeeded(1268.25, 0, 12, 0.01), 100), String(monthlyNeeded(1268.25, 0, 12, 0.01)));
check('aporte necessário quando já alcançou', monthlyNeeded(1000, 1500, 12, 0.01) === 0);
check('prazo no ritmo atual', monthsToTarget(1200, 400, 6000, 0) === 12);
check('sem ritmo: nunca alcança', monthsToTarget(100, 0, 6000, 0) === null);

const mv = (kind: 'inicial' | 'aporte' | 'retirada', amount: number, occurredOn: string) => ({ kind, amount, occurredOn });
let g = goalProgress(6000, [mv('inicial', 1000, '2026-08-01'), mv('aporte', 500, '2026-09-10'), mv('aporte', 500, '2026-10-10'), mv('retirada', 200, '2026-11-05'), mv('aporte', 500, '2026-11-08')], '2026-11-12', '2027-05-31');
check('meta: acumulado = inicial + aportes − retiradas', g.saved === 2300, String(g.saved));
check('meta: restante e progresso', g.remaining === 3700 && near(g.pct, 38.33));
check('meta: ritmo dos últimos 3 meses com movimento', near(g.monthlyPace!, (500 + 500 + 300) / 3), String(g.monthlyPace));
check('meta: aporte necessário até a data', g.monthsLeft === 6 && near(g.neededPerMonth!, 616.67), `${g.monthsLeft} ${g.neededPerMonth}`);
g = goalProgress(1000, [mv('inicial', 1000, '2026-11-01')], '2026-11-12');
check('meta alcançada', g.reached && g.pct === 100 && g.etaMonths === 0 && g.neededPerMonth === null);
g = goalProgress(1000, [], '2026-11-12');
check('meta sem movimentos: sem estimativa inventada', g.saved === 0 && g.monthlyPace === null && g.etaMonths === null);

const usage = budgetUsage([
  { category: 'alimentacao', monthlyLimit: 300, alertThreshold: 80 },
  { category: 'lazer', monthlyLimit: 150, alertThreshold: 80 },
  { category: 'transporte', monthlyLimit: 200, alertThreshold: 90 },
], [{ category: 'alimentacao', amount: 320 }, { category: 'lazer', amount: 125 }]);
check('orçamento ultrapassado', usage[0].status === 'over' && usage[0].remaining === -20);
check('orçamento no alerta', usage[1].status === 'warning' && near(usage[1].pct, 83.33));
check('orçamento sem gastos', usage[2].spent === 0 && usage[2].status === 'ok');

const base = { month: '2026-11', monthLabel: 'novembro de 2026', previousLabel: 'outubro de 2026', today: '2026-11-12', pendingQuotes: 0, connections: [], goals: [], holdings: [] as { symbol: string; share: number }[] };
let ins = computeInsights({ ...base, current: { expenses: 2000, income: 4000, byCategory: [{ category: 'alimentacao', label: 'Alimentação', amount: 320 }] }, previous: { expenses: 1800, byCategory: [{ category: 'alimentacao', amount: 275 }] }, budgets: usage.map((u) => ({ ...u, label: u.category })) });
check('alerta de orçamento ultrapassado com período', ins.some((i) => i.key === 'budget:alimentacao:2026-11:over' && i.basis === 'novembro de 2026'));
check('aumento abaixo de 20% não vira insight', !ins.some((i) => i.kind === 'gastos' && i.title.includes('aumentaram')));
ins = computeInsights({ ...base, current: { expenses: 2000, income: 4000, byCategory: [{ category: 'lazer', label: 'Lazer', amount: 400 }] }, previous: { expenses: 1500, byCategory: [{ category: 'lazer', amount: 200 }] }, budgets: [], holdings: [{ symbol: 'ITUB4', share: 62 }], pendingQuotes: 1, connections: [{ id: 'c1', institution: 'Banco X', status: 'LOGIN_ERROR', lastSyncedAt: null, lastSyncError: null }] });
check('aumento relevante de gastos', ins.some((i) => i.title === 'Gastos com Lazer aumentaram'));
check('concentração acima de 40%', ins.some((i) => i.kind === 'investimento' && i.title.includes('ITUB4')));
check('cotação indisponível', ins.some((i) => i.title === 'Cotação indisponível'));
check('nova autorização necessária', ins.some((i) => i.severity === 'critical' && i.kind === 'integracao'));
check('chave estável (sem repetir alerta)', computeInsights({ ...base, current: { expenses: 0, income: 0, byCategory: [] }, previous: null, budgets: [], holdings: [{ symbol: 'ITUB4', share: 62 }] })[0].key === 'concentration:ITUB4:60');
ins = computeInsights({ ...base, current: { expenses: 0, income: 0, byCategory: [] }, previous: null, budgets: [] });
check('mês sem movimentações: nenhum insight inventado', ins.length === 0);

console.log(`${ok} verificações OK, ${fail} falhas`);
if (fail > 0) process.exit(1);
