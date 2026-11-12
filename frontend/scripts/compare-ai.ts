/**
 * Comparação Groq × Gemini com as mesmas perguntas e somente dados sintéticos.
 * Uso (local, com as chaves no ambiente do terminal, nunca no código):
 *   GROQ_API_KEY=... GEMINI_API_KEY=... npm run compare:ai
 * Mede tempo até o primeiro trecho, tempo total, tamanho e mostra as respostas para avaliação.
 */
import { resolveProvider, type AiEnv } from '../server/ai/providers';
import { systemPrompt, SYNTHETIC_SNAPSHOT } from '../server/ai/prompt';

const QUESTIONS: { text: string; data: boolean }[] = [
  { text: 'Explique o que é preço médio em duas frases.', data: false },
  { text: 'Quanto gastei com alimentação?', data: true },
  { text: 'Por que minha carteira está muito concentrada?', data: true },
  { text: 'Como registro uma compra no AI Wealth Advisor?', data: false },
  { text: 'Qual minha rentabilidade?', data: true },
  { text: 'Responda em uma frase: o que é reserva de emergência?', data: false },
];

const env: AiEnv = {
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
};

async function run(providerName: 'groq' | 'gemini') {
  let provider;
  try {
    provider = resolveProvider(env, fetch, providerName);
  } catch {
    console.log(`\n## ${providerName}: chave ausente, comparação pulada`);
    return;
  }
  console.log(`\n## ${provider.name} (${provider.model})`);
  for (const q of QUESTIONS) {
    const system = systemPrompt('dashboard', q.data ? SYNTHETIC_SNAPSHOT : null, 'Sem dados financeiros nesta pergunta.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const start = Date.now();
    let first: number | null = null;
    let chunks = 0;
    let text = '';
    try {
      for await (const part of provider.stream({ system, messages: [{ role: 'user', content: q.text }], maxTokens: 1024, signal: controller.signal })) {
        if (first === null) first = Date.now() - start;
        chunks++;
        text += part;
      }
      console.log(`\n> ${q.text}\nprimeiro trecho: ${first} ms | total: ${Date.now() - start} ms | trechos: ${chunks} | palavras: ${text.split(/\s+/).filter(Boolean).length}\n${text.trim()}`);
    } catch (error) {
      console.log(`\n> ${q.text}\nERRO: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

(async () => {
  await run('groq');
  await run('gemini');
})();
