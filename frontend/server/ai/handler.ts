import { bearer, failure, HttpError, json, readJson } from '../http';
import { requireUser, type SessionEnv } from '../auth';
import { resolveProvider, type AiEnv, type ChatMessage } from './providers';
import { buildSnapshot, currentMonth } from './snapshot';
import { DIAGNOSIS_REQUEST, SYNTHETIC_SNAPSHOT, systemPrompt } from './prompt';

export type AssistantEnv = SessionEnv & AiEnv;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1500;
const MAX_TOTAL_CHARS = 6000;
const PER_MINUTE = 10;
const PER_DAY = 150;
const FIRST_TOKEN_TIMEOUT = 20_000;
const TOTAL_TIMEOUT = 45_000;
const PAGES = new Set(['dashboard', 'carteiras', 'financas', 'metas', 'orcamentos', 'simulacoes', 'analytics', 'alertas', 'configuracoes', 'integracoes', 'analise']);

const usage = new Map<string, number[]>();

export function resetAssistantLimits() {
  usage.clear();
}

function rateLimit(userId: string) {
  const now = Date.now();
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < 86400_000);
  if (recent.filter((t) => now - t < 60_000).length >= PER_MINUTE) throw new HttpError(429, 'Muitas perguntas em sequência. Aguarde um minuto.');
  if (recent.length >= PER_DAY) throw new HttpError(429, 'Limite diário do assistente atingido.');
  recent.push(now);
  usage.set(userId, recent);
}

function sanitize(input: unknown): ChatMessage[] {
  if (!Array.isArray(input) || !input.length) throw new HttpError(400, 'Envie uma pergunta.');
  const messages = input
    .filter((m): m is ChatMessage => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_MESSAGES);
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpError(400, 'A última mensagem deve ser uma pergunta.');
  let total = 0;
  const kept: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    total += messages[i].content.length;
    if (total > MAX_TOTAL_CHARS && kept.length) break;
    kept.unshift(messages[i]);
  }
  while (kept.length && kept[0].role !== 'user') kept.shift();
  return kept;
}

interface ChatBody {
  messages?: unknown;
  page?: string;
  includeData?: boolean;
  intent?: 'chat' | 'diagnosis';
  compare?: { provider?: string };
}

export async function handleChat(request: Request, env: AssistantEnv, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const token = bearer(request);
    const userId = await requireUser(token, env, fetcher);
    const body = await readJson<ChatBody>(request);
    const page = typeof body.page === 'string' && PAGES.has(body.page) ? body.page : undefined;
    const compare = body.compare !== undefined;

    let provider;
    if (compare) {
      if (!env.aiCompareEnabled) throw new HttpError(403, 'Modo de comparação desativado.');
      provider = resolveProvider(env, fetcher, body.compare?.provider === 'gemini' ? 'gemini' : 'groq');
    } else {
      // Fora da comparação só a Groq recebe resumos reais; o Gemini gratuito pode usar o conteúdo para treino.
      if ((env.aiProvider ?? 'groq') !== 'groq') throw new HttpError(503, 'O provedor configurado só pode ser usado no modo de comparação com dados sintéticos.');
      provider = resolveProvider(env, fetcher, 'groq');
    }
    rateLimit(userId);

    const messages = body.intent === 'diagnosis' ? [{ role: 'user' as const, content: DIAGNOSIS_REQUEST }] : sanitize(body.messages);
    let data: unknown = null;
    let note = 'O usuário não autorizou compartilhar o resumo financeiro nesta conversa. Para perguntas sobre os números dele, explique que é preciso ativar "Incluir meu resumo financeiro".';
    if (compare) {
      data = SYNTHETIC_SNAPSHOT;
    } else if (body.includeData === true) {
      data = (await buildSnapshot({ supabaseUrl: env.supabaseUrl!, supabaseKey: env.supabaseKey!, token }, fetcher, currentMonth())).data;
    }
    const system = systemPrompt(page, data, note);

    const upstream = new AbortController();
    request.signal?.addEventListener('abort', () => upstream.abort());
    const firstToken = setTimeout(() => upstream.abort(), FIRST_TOKEN_TIMEOUT);
    const total = setTimeout(() => upstream.abort(), TOTAL_TIMEOUT);
    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController, payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    const iterator = provider.stream({ system, messages, maxTokens: body.intent === 'diagnosis' ? 900 : 1024, signal: upstream.signal });

    const stream = new ReadableStream({
      async start(controller) {
        const started = Date.now();
        let first: number | null = null;
        try {
          for await (const text of iterator) {
            if (first === null) {
              first = Date.now() - started;
              clearTimeout(firstToken);
            }
            send(controller, { type: 'delta', text });
          }
          send(controller, { type: 'done', provider: provider.name, model: provider.model, firstTokenMs: first, totalMs: Date.now() - started, synthetic: compare });
        } catch (error) {
          const message = upstream.signal.aborted
            ? request.signal?.aborted
              ? 'Resposta interrompida.'
              : 'O assistente demorou demais para responder. Tente novamente.'
            : error instanceof HttpError
              ? error.message
              : 'O assistente encontrou um erro. Tente novamente.';
          send(controller, { type: 'error', message });
        } finally {
          clearTimeout(firstToken);
          clearTimeout(total);
          controller.close();
        }
      },
      cancel() {
        upstream.abort();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
  } catch (error) {
    return failure(error);
  }
}

/** Resumo determinístico (sem IA) para os cards da Análise IA e para mostrar o que seria enviado. */
export async function handleSnapshot(request: Request, env: AssistantEnv, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const token = bearer(request);
    await requireUser(token, env, fetcher);
    const snapshot = await buildSnapshot({ supabaseUrl: env.supabaseUrl!, supabaseKey: env.supabaseKey!, token }, fetcher, currentMonth());
    return json({ ...snapshot, aiConfigured: Boolean(env.groqApiKey) && (env.aiProvider ?? 'groq') === 'groq' });
  } catch (error) {
    return failure(error);
  }
}
