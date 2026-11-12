// Verificação do serviço de cotações com respostas simuladas da brapi. Rodar: npm run check:quotes
import { handleQuotesRequest, resetQuoteState, type QuotesEnv } from '../server/quotes';

let ok = 0, fail = 0;
const check = (name: string, cond: boolean, detail = '') => { if (cond) ok++; else { fail++; console.log('FALHOU', name, detail); } };

const ENV: QuotesEnv = { supabaseUrl: 'https://projeto.supabase.co', supabaseKey: 'sb_publishable_teste', brapiKey: 'chave-secreta-de-teste' };
const QUOTE = (symbol: string, price: number, requested = symbol) => ({ results: [{ requestedSymbol: requested, symbol, changed: requested !== symbol, data: { shortName: symbol, currency: 'BRL', regularMarketPrice: price, regularMarketChangePercent: 1.25, regularMarketTime: '2026-11-11T17:08:02.000Z' } }], requestedAt: '2026-11-11T17:08:05.000Z', took: 120 });

let calls: { url: string; auth?: string }[] = [];
let active = 0, maxActive = 0;
let brapi: (symbol: string) => Response | Promise<Response> = () => new Response('{}', { status: 500 });
const fetcher = (async (input: string, init?: RequestInit) => {
  const url = String(input);
  const headers = (init?.headers ?? {}) as Record<string, string>;
  calls.push({ url, auth: headers.Authorization });
  if (url.includes('/auth/v1/user')) return new Response('{}', { status: headers.Authorization === 'Bearer token-valido' ? 200 : 401 });
  active++; maxActive = Math.max(maxActive, active);
  await new Promise((r) => setTimeout(r, 5));
  try { return await brapi(new URL(url).searchParams.get('symbols')!); } finally { active--; }
}) as typeof fetch;

const req = (symbols: string, token = 'token-valido', force = false) =>
  handleQuotesRequest(new Request(`http://localhost/api/quotes?symbols=${symbols}${force ? '&force=1' : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }), ENV, fetcher);
const body = async (r: Response) => ({ status: r.status, data: await r.json(), text: '' });
const brapiCalls = () => calls.filter((c) => c.url.includes('brapi.dev')).length;

async function main() {
  resetQuoteState();
  brapi = (s) => (s === 'ITUB4' || s === 'PETR4' ? new Response(JSON.stringify(QUOTE(s, s === 'ITUB4' ? 37.42 : 41.18)), { status: 200 }) : new Response('{"error":true}', { status: 404 }));

  check('sem token: 401', (await req('ITUB4', '')).status === 401);
  check('token inválido: 401', (await req('ITUB4', 'token-forjado')).status === 401);
  check('nenhuma cota gasta sem sessão válida', brapiCalls() === 0);

  calls = [];
  let r = await body(await req('ITUB4'));
  const q = r.data.quotes[0];
  check('ITUB4 com preço', r.status === 200 && q.status === 'ok' && q.price === 37.42 && q.changePercent === 1.25 && q.quotedAt === '2026-11-11T17:08:02.000Z', JSON.stringify(q));
  check('chave enviada no header Authorization', calls.find((c) => c.url.includes('brapi.dev'))?.auth === 'Bearer chave-secreta-de-teste');
  check('endpoint v2 com um ativo', calls.some((c) => c.url === 'https://brapi.dev/api/v2/stocks/quote?symbols=ITUB4'));
  check('chave nunca aparece na resposta', !JSON.stringify(r.data).includes('chave-secreta'));

  calls = [];
  r = await body(await req('ITUB4'));
  check('segunda consulta usa cache (0 chamadas)', r.data.upstreamCalls === 0 && brapiCalls() === 0 && r.data.quotes[0].price === 37.42);
  check('sessão validada fica em cache', calls.filter((c) => c.url.includes('/auth/v1/user')).length === 0);
  r = await body(await req('ITUB4', 'token-valido', true));
  check('atualização forçada antes de 60 s não consulta de novo', r.data.upstreamCalls === 0);

  calls = []; maxActive = 0;
  r = await body(await req('PETR4,XPTO3,ITUB4'));
  const bySymbol = Object.fromEntries(r.data.quotes.map((x: { symbol: string }) => [x.symbol, x]));
  check('ticker inexistente: pendente com motivo', bySymbol.XPTO3.status === 'unavailable' && bySymbol.XPTO3.reason === 'not_found');
  check('um erro não derruba os outros', bySymbol.PETR4.status === 'ok' && bySymbol.ITUB4.status === 'ok');
  check('ordem preservada', r.data.quotes.map((x: { symbol: string }) => x.symbol).join() === 'PETR4,XPTO3,ITUB4');
  check('uma requisição por vez (plano gratuito)', maxActive === 1, `máx. simultâneas: ${maxActive}`);
  check('um ativo por requisição', calls.filter((c) => c.url.includes('brapi.dev')).every((c) => !decodeURIComponent(c.url).includes(',')));

  calls = [];
  r = await body(await req('XPTO3'));
  check('falha "não encontrado" também fica em cache', r.data.upstreamCalls === 0);

  brapi = () => new Response('{"error":true,"message":"Token necessário"}', { status: 401 });
  r = await body(await req('WEGE3'));
  check('ativo que exige chave: requires_key', r.data.quotes[0].reason === 'requires_key');

  brapi = () => new Response('{"error":true}', { status: 403 });
  r = await body(await req('BOVA11'));
  check('ativo fora do plano: plan_restricted', r.data.quotes[0].reason === 'plan_restricted');

  brapi = () => { throw new Error('ECONNRESET'); };
  r = await body(await req('VALE3'));
  check('falha de rede: provider_error, sem quebrar', r.status === 200 && r.data.quotes[0].reason === 'provider_error');
  brapi = (s) => new Response(JSON.stringify(QUOTE(s, 61.2)), { status: 200 });
  r = await body(await req('VALE3'));
  check('falha de rede não fica em cache: tenta de novo', r.data.quotes[0].status === 'ok' && r.data.upstreamCalls === 1);

  brapi = () => new Response('<html>erro</html>', { status: 200 });
  r = await body(await req('MGLU3'));
  check('resposta malformada: provider_error', r.data.quotes[0].reason === 'provider_error');

  brapi = (s) => new Response(JSON.stringify({ results: [{ requestedSymbol: s, symbol: s, data: { regularMarketPrice: null } }] }), { status: 200 });
  r = await body(await req('ABEV3'));
  check('resposta sem preço: pendente, não zero', r.data.quotes[0].status === 'unavailable');

  brapi = (s) => new Response(JSON.stringify(QUOTE('AXIA3', 50, s)), { status: 200 });
  r = await body(await req('AXIA5'));
  check('ticker renomeado (changed): usa requestedSymbol', r.data.quotes[0].status === 'ok' && r.data.quotes[0].symbol === 'AXIA5');

  brapi = () => new Response('{"error":true}', { status: 429, headers: { 'Retry-After': '30' } });
  calls = [];
  r = await body(await req('RENT3,SUZB3,ITUB4'));
  const rl = Object.fromEntries(r.data.quotes.map((x: { symbol: string }) => [x.symbol, x]));
  check('429: marcado como limite atingido', rl.RENT3.reason === 'rate_limited');
  check('429: não insiste nos ativos seguintes', brapiCalls() === 1, `chamadas: ${brapiCalls()}`);
  check('429: cotação já em cache continua disponível', rl.ITUB4.status === 'ok');

  check('símbolo inválido: 400', (await req('ITUB4;DROP')).status === 400);
  check('mais de 20 ativos: 400', (await req(Array.from({ length: 21 }, (_, i) => `AAAA${i}`).join(','))).status === 400);
  check('sem ativos: 400', (await req('')).status === 400);
  check('método diferente de GET: 405', (await handleQuotesRequest(new Request('http://localhost/api/quotes?symbols=ITUB4', { method: 'POST', headers: { Authorization: 'Bearer token-valido' } }), ENV, fetcher)).status === 405);
  check('sem configuração do Supabase no servidor: 503', (await handleQuotesRequest(new Request('http://localhost/api/quotes?symbols=ITUB4'), {}, fetcher)).status === 503);

  console.log(`${ok} verificações OK, ${fail} falhas`);
  if (fail > 0) process.exit(1);
}
main();
