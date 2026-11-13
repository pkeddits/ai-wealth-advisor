export interface ApiErrorBody {
  error?: string;
  code?: string;
  kind?: string;
  title?: string;
}

/**
 * Lê o erro de uma função do servidor. Quando a função nem chega a executar, a Vercel devolve HTML
 * (ex.: FUNCTION_INVOCATION_FAILED); nesse caso a mensagem aponta para o log da função.
 */
export async function readApiError(res: Response, fallback: string): Promise<ApiErrorBody & { message: string }> {
  const type = res.headers.get('content-type') ?? '';
  const body = type.includes('application/json') ? ((await res.json().catch(() => ({}))) as ApiErrorBody) : {};
  if (body.error) return { ...body, message: body.error };
  const vercel = res.headers.get('x-vercel-error');
  if (vercel || res.status === 500 || res.status === 502) {
    return { code: 'function_failed', message: `O servidor não conseguiu executar esta função${vercel ? ` (${vercel})` : ''}. Tente novamente em instantes.` };
  }
  if (res.status === 404) return { code: 'function_missing', message: 'Função do servidor não encontrada nesta publicação.' };
  if (res.status === 504) return { code: 'function_timeout', message: 'O servidor demorou demais para responder. Tente novamente.' };
  return { message: fallback };
}
