/**
 * Reproduz o runtime Node da Vercel: cada arquivo de api/ e server/ é transpilado isoladamente, sem
 * bundle, e carregado como ES module. Em seguida chama os pontos de entrada reais (as funções GET/POST
 * exportadas) com fetch simulado para Supabase, Groq, Pluggy e brapi.
 */
import { transform } from 'esbuild';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
const check = (name, condition, detail = '') => {
  if (condition) passed++;
  else {
    failed++;
    console.log(`FALHA  ${name}${detail ? ` (${detail})` : ''}`);
  }
};

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(rel)));
    else out.push(rel);
  }
  return out;
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

async function graph(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = await readFile(path.join(root, file), 'utf8');
    for (const match of source.matchAll(IMPORT)) {
      const spec = match[1] ?? match[2];
      check(`${file}: import relativo com extensão .js (${spec})`, spec.endsWith('.js'));
      check(`${file}: sem import de JSON (${spec})`, !spec.endsWith('.json'));
      if (spec.endsWith('.js')) queue.push(path.normalize(path.join(path.dirname(file), spec.replace(/\.js$/, '.ts'))));
    }
  }
  return [...seen];
}

const entries = (await walk('api')).filter((f) => f.endsWith('.ts'));
const files = await graph(entries);
const out = await mkdtemp(path.join(tmpdir(), 'aiwa-fn-'));
await copyFile(path.join(root, 'package.json'), path.join(out, 'package.json'));
await mkdir(path.join(out, 'node_modules'), { recursive: true });
for (const file of files) {
  const { code } = await transform(await readFile(path.join(root, file), 'utf8'), { loader: 'ts', format: 'esm', target: 'node20' });
  const target = path.join(out, file.replace(/\.ts$/, '.js'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, code);
}

const mod = {};
for (const entry of entries) {
  const name = entry.replace(/\\/g, '/').replace(/\.ts$/, '');
  try {
    mod[name] = await import(pathToFileURL(path.join(out, `${name}.js`)).href);
    check(`${name} carrega no Node ESM`, true);
  } catch (error) {
    check(`${name} carrega no Node ESM`, false, error.code ?? error.message);
  }
}

const USER = '11111111-1111-4111-8111-111111111111';
const SUPA = 'https://proj.supabase.co';
let calls = [];
let groqMode = 'ok';
const sse = (chunks) =>
  new Response(new ReadableStream({ start(c) { for (const t of chunks) c.enqueue(new TextEncoder().encode(t)); c.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers);
  for (const [, value] of headers) if (/[\r\n]/.test(value)) throw new TypeError('Invalid header value');
  calls.push({ url, method: init.method ?? 'GET', headers, body: init.body });
  if (url === `${SUPA}/auth/v1/user`) return headers.get('authorization') === 'Bearer user-token' ? Response.json({ id: USER }) : new Response('{}', { status: 401 });
  if (url.startsWith(`${SUPA}/rest/v1/`)) return Response.json([]);
  if (url.startsWith('https://api.groq.com/openai/v1/chat/completions')) {
    if (groqMode === 'ok') return sse(['data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n', 'data: {"choices":[{"delta":{"content":", tudo certo."}}]}\n', '\ndata: [DONE]\n\n']);
    return new Response('{}', { status: Number(groqMode) });
  }
  if (url.startsWith('https://api.groq.com/openai/v1/models/')) return Response.json({ id: 'openai/gpt-oss-120b' });
  if (url === 'https://api.pluggy.ai/auth') return Response.json({ apiKey: 'pluggy-api-key' });
  if (url === 'https://api.pluggy.ai/connect_token') return Response.json({ accessToken: 'connect-token' });
  if (url.startsWith('https://brapi.dev/')) return Response.json({ results: [{ requestedSymbol: 'PETR4', data: { regularMarketPrice: 37.5, regularMarketChangePercent: 1.2, currency: 'BRL', regularMarketTime: '2026-11-13T18:00:00.000Z' } }] });
  return new Response('not mocked', { status: 599 });
};

const BASE_ENV = {
  SUPABASE_URL: `${SUPA}\n`,
  SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_test ',
  SUPABASE_SECRET_KEY: 'sb_secret_test\n',
  GROQ_API_KEY: '"gsk_test"\n',
  AI_PROVIDER: ' Groq ',
  GROQ_MODEL: 'openai/gpt-oss-120b',
  PLUGGY_CLIENT_ID: 'client-id',
  PLUGGY_CLIENT_SECRET: 'client-secret\r\n',
  BRAPI_API_KEY: 'brapi-key',
};
const withEnv = (overrides = {}) => {
  for (const key of Object.keys(BASE_ENV)) delete process.env[key];
  Object.assign(process.env, BASE_ENV, overrides);
  for (const [k, v] of Object.entries(overrides)) if (v === undefined) delete process.env[k];
};
const post = (url, body, token = 'user-token') =>
  new Request(`https://app.vercel.app${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const get = (url, token = 'user-token') => new Request(`https://app.vercel.app${url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
const question = { messages: [{ role: 'user', content: 'Como estão minhas finanças?' }], page: 'dashboard', includeData: false };

async function readStream(res) {
  const text = await res.text();
  return text.split('\n\n').filter((l) => l.startsWith('data:')).map((l) => JSON.parse(l.slice(5)));
}

const chat = mod['api/ai/chat']?.POST;
if (chat) {
  withEnv();
  calls = [];
  groqMode = 'ok';
  let res = await chat(post('/api/ai/chat', question));
  check('IA: 200 com streaming', res.status === 200 && res.headers.get('content-type')?.startsWith('text/event-stream'), String(res.status));
  const events = await readStream(res);
  check('IA: trechos na ordem', events.filter((e) => e.type === 'delta').map((e) => e.text).join('') === 'Olá, tudo certo.');
  check('IA: evento final com modelo', events.at(-1)?.type === 'done' && events.at(-1)?.model === 'openai/gpt-oss-120b');
  const groqCall = calls.find((c) => c.url.includes('chat/completions'));
  check('IA: chave limpa de espaço, aspas e quebra de linha', groqCall?.headers.get('authorization') === 'Bearer gsk_test');
  check('IA: modelo configurado preservado', JSON.parse(groqCall?.body ?? '{}').model === 'openai/gpt-oss-120b');
  check('IA: sem resumo financeiro quando não autorizado', !calls.some((c) => c.url.includes('/rest/v1/')));

  calls = [];
  res = await chat(post('/api/ai/chat', { ...question, includeData: true }));
  await res.text();
  const rest = calls.filter((c) => c.url.includes('/rest/v1/'));
  check('IA: resumo lido com o token do usuário (RLS), nunca com a chave secreta', rest.length > 0 && rest.every((c) => c.headers.get('authorization') === 'Bearer user-token' && c.headers.get('apikey') === 'sb_publishable_test'));

  for (const [mode, status, code] of [['401', 503, 'provider_auth'], ['429', 429, 'provider_rate_limit'], ['404', 503, 'provider_model'], ['500', 502, 'provider_unavailable']]) {
    groqMode = mode;
    res = await chat(post('/api/ai/chat', question));
    const body = await res.json().catch(() => ({}));
    check(`IA: Groq ${mode} vira HTTP ${status} (${code})`, res.status === status && body.code === code, `${res.status} ${body.code}`);
  }
  groqMode = 'ok';
  res = await chat(post('/api/ai/chat', question, null));
  check('IA: sem token → 401', res.status === 401);
  res = await chat(post('/api/ai/chat', question, 'forged'));
  check('IA: token inválido → 401 (session)', res.status === 401 && (await res.json()).code === 'session');
  withEnv({ GROQ_API_KEY: undefined });
  res = await chat(post('/api/ai/chat', question, 'user-token'));
  check('IA: sem GROQ_API_KEY → 503 (not_configured)', res.status === 503 && (await res.json()).code === 'not_configured');
  withEnv({ SUPABASE_URL: undefined, VITE_SUPABASE_URL: SUPA, SUPABASE_PUBLISHABLE_KEY: undefined, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' });
  res = await chat(post('/api/ai/chat', question));
  check('IA: aceita VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no servidor', res.status === 200);
  await res.text();
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

const snapshot = mod['api/ai/snapshot']?.POST;
if (snapshot) {
  withEnv();
  const res = await snapshot(post('/api/ai/snapshot', {}));
  const body = await res.json();
  check('Análise IA: snapshot 200 com aiConfigured', res.status === 200 && body.aiConfigured === true, String(res.status));
}

const connect = mod['api/pluggy/connect-token']?.POST;
if (connect) {
  withEnv();
  calls = [];
  let res = await connect(post('/api/pluggy/connect-token', {}));
  const body = await res.json();
  check('Pluggy: connect token 200', res.status === 200 && body.accessToken === 'connect-token', String(res.status));
  const auth = calls.find((c) => c.url.endsWith('/auth'));
  check('Pluggy: secret enviado sem quebra de linha', JSON.parse(auth?.body ?? '{}').clientSecret === 'client-secret');
  const token = calls.find((c) => c.url.endsWith('/connect_token'));
  check('Pluggy: clientUserId é o usuário da sessão', JSON.parse(token?.body ?? '{}').options?.clientUserId === USER);
  res = await connect(post('/api/pluggy/connect-token', {}, null));
  check('Pluggy: sem token → 401', res.status === 401);
}

const quotes = mod['api/quotes']?.GET;
if (quotes) {
  withEnv();
  calls = [];
  let res = await quotes(get('/api/quotes?symbols=PETR4'));
  const body = await res.json();
  check('brapi: 200 com cotação parseada', res.status === 200 && body.quotes?.[0]?.status === 'ok' && body.quotes[0].price === 37.5, JSON.stringify(body).slice(0, 120));
  check('brapi: chave só no servidor', calls.find((c) => c.url.startsWith('https://brapi.dev/'))?.headers.get('authorization') === 'Bearer brapi-key');
  res = await quotes(get('/api/quotes?symbols=PETR4', null));
  check('brapi: sem token → 401', res.status === 401);
}

const health = mod['api/health']?.GET;
if (health) {
  withEnv();
  let res = await health(get('/api/health?probe=1'));
  const text = await res.text();
  const body = JSON.parse(text);
  check('Diagnóstico: 200 autenticado', res.status === 200);
  check('Diagnóstico: verificações ativas', body.checks?.groq === 'ok' && body.checks?.pluggy === 'ok' && body.checks?.supabaseSecret === 'ok', JSON.stringify(body.checks));
  check('Diagnóstico: nenhum valor secreto na resposta', !['gsk_test', 'client-secret', 'sb_secret_test', 'brapi-key', 'pluggy-api-key'].some((s) => text.includes(s)));
  res = await health(get('/api/health', null));
  check('Diagnóstico: sem token → 401', res.status === 401);
}

await rm(out, { recursive: true, force: true });
console.log(`${passed} verificações OK, ${failed} falhas`);
process.exit(failed ? 1 : 0);
