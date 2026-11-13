import { HttpError } from '../http.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  signal: AbortSignal;
}

export interface ChatProvider {
  name: 'groq' | 'gemini';
  model: string;
  /** Emite os trechos de texto na ordem em que o modelo os gera. */
  stream(request: ProviderRequest): AsyncGenerator<string>;
}

export interface AiEnv {
  aiProvider?: string;
  groqApiKey?: string;
  groqModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  aiCompareEnabled?: boolean;
  /** Somente para testes. */
  groqBaseUrl?: string;
  geminiBaseUrl?: string;
}

async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (line.startsWith('data:')) yield line.slice(5).trim();
      }
    }
    if (buffer.trim().startsWith('data:')) yield buffer.trim().slice(5).trim();
  } finally {
    reader.releaseLock();
  }
}

function upstreamError(status: number, provider: string): HttpError {
  if (status === 429) return new HttpError(429, 'O assistente atingiu o limite de uso do provedor. Tente novamente em instantes.', { code: 'provider_rate_limit' });
  if (status === 401 || status === 403) return new HttpError(503, 'A chave do provedor de IA foi recusada. Confira GROQ_API_KEY no servidor.', { code: 'provider_auth' });
  if (status === 404) return new HttpError(503, `Modelo de IA indisponível no provedor (${provider}). Confira GROQ_MODEL.`, { code: 'provider_model' });
  if (status === 400 || status === 413 || status === 422) return new HttpError(502, 'O provedor de IA recusou a requisição. Tente uma pergunta mais curta.', { code: 'provider_rejected' });
  if (status >= 500) return new HttpError(502, 'O provedor de IA está instável no momento. Tente novamente em instantes.', { code: 'provider_unavailable' });
  return new HttpError(502, 'O provedor de IA não respondeu como esperado. Tente novamente.', { code: 'provider_error' });
}

export function groqProvider(env: AiEnv, fetcher: typeof fetch): ChatProvider {
  const model = env.groqModel || 'openai/gpt-oss-120b';
  return {
    name: 'groq',
    model,
    async *stream({ system, messages, maxTokens, signal }) {
      const res = await fetcher(`${env.groqBaseUrl ?? 'https://api.groq.com'}/openai/v1/chat/completions`, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${env.groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.5,
          max_completion_tokens: maxTokens,
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {}),
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      });
      if (!res.ok || !res.body) throw upstreamError(res.status, 'Groq');
      for await (const data of sseData(res.body)) {
        if (data === '[DONE]') return;
        let chunk: { choices?: { delta?: { content?: string } }[]; error?: unknown };
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) throw new HttpError(502, 'O provedor de IA interrompeu a resposta.');
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) yield text;
      }
    },
  };
}

export function geminiProvider(env: AiEnv, fetcher: typeof fetch): ChatProvider {
  const model = env.geminiModel || 'gemini-2.5-flash';
  return {
    name: 'gemini',
    model,
    async *stream({ system, messages, maxTokens, signal }) {
      const url = `${env.geminiBaseUrl ?? 'https://generativelanguage.googleapis.com'}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
      const res = await fetcher(url, {
        method: 'POST',
        signal,
        headers: { 'x-goog-api-key': env.geminiApiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens },
        }),
      });
      if (!res.ok || !res.body) throw upstreamError(res.status, 'Gemini');
      for await (const data of sseData(res.body)) {
        const chunk = JSON.parse(data) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
        if (text) yield text;
      }
    },
  };
}

/** Escolhe o provedor configurado. Não há troca automática entre provedores. */
export function resolveProvider(env: AiEnv, fetcher: typeof fetch, requested?: string): ChatProvider {
  const name = requested ?? env.aiProvider ?? 'groq';
  if (name === 'groq') {
    if (!env.groqApiKey) throw new HttpError(503, 'O assistente de IA ainda não foi configurado neste ambiente.', { code: 'not_configured' });
    return groqProvider(env, fetcher);
  }
  if (name === 'gemini') {
    if (!env.geminiApiKey) throw new HttpError(503, 'O provedor de comparação não está configurado.');
    return geminiProvider(env, fetcher);
  }
  throw new HttpError(400, 'Provedor de IA desconhecido.');
}
