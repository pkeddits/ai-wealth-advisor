export class HttpError extends Error {
  constructor(public status: number, message: string, public detail?: Record<string, string>) {
    super(message);
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, 'Corpo da requisição inválido.');
  }
}

export function bearer(request: Request): string {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Autenticação necessária.');
  return token;
}

/** Converte qualquer falha em resposta sem detalhes internos, tokens ou dados pessoais. */
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message, ...error.detail }, error.status);
  return json({ error: 'Não foi possível concluir a operação. Tente novamente.' }, 500);
}
