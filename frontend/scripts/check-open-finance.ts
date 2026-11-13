// Classificação de transações importadas e totais do mês. Rodar: npm run check:openfinance
import { classifyOpenFinanceError, providerErrorSignals } from '../src/domain/openFinanceErrors';
import { classifyTransaction, brazilDate, normalizeInvestment, normalizeAccount, type PluggyTransaction } from '../server/pluggy/normalize';
import { summarizeMonth } from '../src/domain/finance';

let ok = 0, fail = 0;
const check = (name: string, cond: boolean, detail = '') => { if (cond) ok++; else { fail++; console.log('FALHOU', name, detail); } };
const tx = (o: Partial<PluggyTransaction>): PluggyTransaction => ({ id: 'id', description: '', amount: 0, date: '2026-11-10T12:00:00.000Z', ...o });
const c = (o: Partial<PluggyTransaction>, kind: 'BANK' | 'CREDIT' = 'BANK', card = true) => classifyTransaction(tx(o), kind, card)!;

let e = c({ description: 'SALARIO EMPRESA XYZ LTDA', amount: 8500, type: 'CREDIT', category: 'Salary' });
check('salário: receita regular', e.kind === 'receita' && e.flow === 'regular' && e.category === 'salario' && !e.needs_review);
e = c({ description: 'PIX ENVIADO', amount: -1000, type: 'DEBIT', operationType: 'PIX', paymentData: { payer: { documentNumber: { value: '123.456.789-00' } }, receiver: { documentNumber: { value: '12345678900' } } } });
check('Pix entre contas do mesmo titular: transferência', e.flow === 'transfer' && !e.needs_review);
e = c({ description: 'PIX ENVIADO JOAO', amount: -120, type: 'DEBIT', operationType: 'PIX' });
check('Pix para terceiro sem categoria: revisar', e.kind === 'despesa' && e.needs_review === true);
e = c({ description: 'PIX RECEBIDO MARIA', amount: 200, type: 'CREDIT', operationType: 'PIX' });
check('Pix recebido sem identificação: revisar (não vira renda)', e.kind === 'receita' && e.needs_review === true);
e = c({ description: 'PAGAMENTO FATURA CARTAO', amount: -503.1, type: 'DEBIT' });
check('pagamento de fatura com cartão conectado: fora dos totais', e.flow === 'card_payment' && !e.needs_review);
e = c({ description: 'PAGAMENTO FATURA CARTAO', amount: -503.1, type: 'DEBIT' }, 'BANK', false);
check('pagamento de fatura sem cartão conectado: revisar', e.flow === 'card_payment' && e.needs_review === true);
e = c({ description: 'APLICACAO CDB', amount: -2000, type: 'DEBIT' });
check('aplicação: investimento, fora dos totais', e.flow === 'investment');
e = c({ description: 'RESGATE CDB', amount: 500, type: 'CREDIT', operationType: 'RESGATE_APLIC_FINANCEIRA' });
check('resgate: investimento, não é renda', e.flow === 'investment' && e.kind === 'receita');
e = c({ description: 'ENEL ENERGIA', amount: -180, type: 'DEBIT', category: 'Electricity' });
check('conta de luz: despesa de moradia', e.kind === 'despesa' && e.category === 'moradia' && e.flow === 'regular');
e = c({ description: 'COMPRA AGENDADA', amount: -50, type: 'DEBIT', status: 'PENDING' });
check('pendente marcado como pendente', e.status === 'pending');
e = c({ description: 'NETFLIX.COM', amount: -55.9, type: 'DEBIT' }, 'CREDIT');
check('compra no cartão (sinal do Sandbox, type DEBIT): despesa', e.kind === 'despesa' && e.amount === 55.9 && e.category === 'lazer');
e = c({ description: 'IFOOD', amount: 89.9 }, 'CREDIT');
check('compra no cartão sem type (sinal documentado +): despesa', e.kind === 'despesa' && e.category === 'alimentacao');
e = c({ description: 'ESTORNO IFOOD', amount: 89.9, type: 'CREDIT', operationType: 'ESTORNO' }, 'CREDIT');
check('estorno no cartão: refund', e.flow === 'refund' && e.category === 'alimentacao');
e = c({ description: 'PAGAMENTO RECEBIDO', amount: -503.1, type: 'CREDIT', operationType: 'PAGAMENTO_FATURA' }, 'CREDIT');
check('pagamento recebido no cartão: fora dos totais', e.flow === 'card_payment');
check('valor zero ignorado', classifyTransaction(tx({ amount: 0 }), 'BANK', true) === null);
check('data em horário de Brasília (UTC−3)', brazilDate('2026-11-01T01:30:00.000Z') === '2026-10-31' && brazilDate('2026-11-01T12:00:00.000Z') === '2026-11-01');
const inv = normalizeInvestment({ id: 'i', name: 'CDR', type: 'FIXED_INCOME', subtype: 'CDB', balance: 2000 });
check('investimento sem custo: custo e quantidade ficam null', inv.amount_original === null && inv.quantity === null && inv.balance === 2000);
const acc = normalizeAccount({ id: 'a', type: 'BANK', subtype: 'CHECKING_ACCOUNT', number: '123/0001/12345-0', balance: 21544.6 });
check('conta: guarda só os 4 últimos dígitos', acc.number_last4 === '3450' && acc.name === 'Conta corrente');

const m = summarizeMonth([
  { kind: 'receita', amount: 8500, category: 'salario', occurredOn: '2026-11-05' },
  { kind: 'despesa', amount: 1000, category: 'outros', occurredOn: '2026-11-06', flow: 'transfer' },
  { kind: 'despesa', amount: 120, category: 'outros', occurredOn: '2026-11-06', needsReview: true },
  { kind: 'despesa', amount: 503.1, category: 'outros', occurredOn: '2026-11-07', flow: 'card_payment' },
  { kind: 'despesa', amount: 2000, category: 'outros', occurredOn: '2026-11-07', flow: 'investment' },
  { kind: 'despesa', amount: 89.9, category: 'alimentacao', occurredOn: '2026-11-08' },
  { kind: 'receita', amount: 89.9, category: 'alimentacao', occurredOn: '2026-11-09', flow: 'refund' },
  { kind: 'despesa', amount: 55.9, category: 'lazer', occurredOn: '2026-11-09' },
  { kind: 'despesa', amount: 50, category: 'outros', occurredOn: '2026-11-10', status: 'pending' },
], '2026-11');
check('receitas: só o salário', m.income === 8500, String(m.income));
check('despesas: compra − estorno + streaming (sem fatura, aplicação, transferência, pendente)', m.expenses === 55.9, String(m.expenses));
check('saldo do período', m.net === 8444.1, String(m.net));
check('estorno zera a categoria', !m.expensesByCategory.some((x) => x.category === 'alimentacao'));
check('contagens fora dos totais', m.pending === 1 && m.review === 1 && m.neutral === 3, JSON.stringify([m.pending, m.review, m.neutral]));


const kindOf = (v: unknown) => classifyOpenFinanceError(...providerErrorSignals(v)).kind;
check('erro de trial da Pluggy (corpo da API)', kindOf({ code: 403, codeDescription: 'TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED', message: 'Trial clients cannot create items' }) === 'trial');
check('erro de trial vindo do widget (data aninhado)', kindOf({ message: 'Error creating item', data: { codeDescription: 'TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED' } }) === 'trial');
check('trial com mensagem amigável, sem o código bruto', !classifyOpenFinanceError('TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED').message.includes('TRIAL'));
check('credenciais inválidas na instituição', kindOf({ data: { item: { status: 'LOGIN_ERROR', error: { code: 'INVALID_CREDENTIALS' } } } }) === 'credentials');
check('instituição fora do ar', kindOf({ data: { item: { executionStatus: 'SITE_NOT_AVAILABLE' } } }) === 'institution');
check('autorização negada no banco', kindOf({ message: 'USER_AUTHORIZATION_NOT_GRANTED' }) === 'authorization');
check('credenciais da aplicação recusadas', classifyOpenFinanceError(null, 'UNAUTHORIZED_CLIENT').kind === 'config');
check('erro desconhecido é genérico', kindOf({ message: 'Something odd' }) === 'generic' && kindOf(undefined) === 'generic');

console.log(`${ok} verificações OK, ${fail} falhas`);
if (fail > 0) process.exit(1);
