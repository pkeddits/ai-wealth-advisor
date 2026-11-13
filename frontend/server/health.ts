import { bearer, failure, HttpError, json } from './http.js';
import { requireUser } from './auth.js';
import { configurationReport, serverEnv } from './env.js';

type Probe = 'ok' | 'not_configured' | 'invalid_credentials' | 'model_unavailable' | 'unreachable' | 'unexpected';

async function probe(run: () => Promise<Response>, onStatus: (status: number) => Probe = (s) => (s === 401 || s === 403 ? 'invalid_credentials' : 'unexpected')): Promise<Probe> {
  try {
    const res = await run();
    return res.ok ? 'ok' : onStatus(res.status);
  } catch {
    return 'unreachable';
  }
}

/**
 * Diagnóstico do ambiente publicado. Exige sessão válida e devolve apenas presença de variáveis e o
 * resultado de chamadas de verificação; nenhum valor, token ou dado de usuário sai daqui.
 */
export async function handleHealth(request: Request, source: Record<string, string | undefined>, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    if (request.method !== 'GET') throw new HttpError(405, 'Método não permitido.');
    const env = serverEnv(source);
    await requireUser(bearer(request), env, fetcher);
    const report = configurationReport(source);
    const live = new URL(request.url).searchParams.get('probe') === '1';
    const checks: Record<string, Probe> = {};
    if (live) {
      const supabaseBase = env.supabaseUrl!.replace(/\/$/, '');
      const groqBase = env.groqBaseUrl ?? 'https://api.groq.com';
      const model = env.groqModel || 'openai/gpt-oss-120b';
      const [supabaseSecret, groq, pluggy] = await Promise.all([
        env.supabaseSecretKey
          ? probe(() => fetcher(`${supabaseBase}/rest/v1/bank_connections?select=id&limit=1`, { headers: { apikey: env.supabaseSecretKey!, ...(env.supabaseSecretKey!.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${env.supabaseSecretKey}` }) } }))
          : Promise.resolve<Probe>('not_configured'),
        env.groqApiKey
          ? probe(() => fetcher(`${groqBase}/openai/v1/models/${model}`, { headers: { Authorization: `Bearer ${env.groqApiKey}` } }), (s) => (s === 401 || s === 403 ? 'invalid_credentials' : s === 404 ? 'model_unavailable' : 'unexpected'))
          : Promise.resolve<Probe>('not_configured'),
        env.pluggyClientId && env.pluggyClientSecret
          ? probe(() => fetcher('https://api.pluggy.ai/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: env.pluggyClientId, clientSecret: env.pluggyClientSecret }) }))
          : Promise.resolve<Probe>('not_configured'),
      ]);
      Object.assign(checks, { supabaseSecret, groq, pluggy });
    }
    return json({
      runtime: { node: process.version, vercelEnv: source.VERCEL_ENV ?? 'local', region: source.VERCEL_REGION ?? null, commit: source.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null },
      configuration: report,
      checks: live ? checks : undefined,
    });
  } catch (error) {
    return failure(error);
  }
}
