/** Extrai uma mensagem exibível de erros do Supabase, do Axios ou genéricos. */
export function errorMessage(error: unknown, fallback = 'Não foi possível concluir a operação. Tente novamente.'): string {
  if (typeof error === 'object' && error !== null) {
    const apiMessage = (error as { response?: { data?: { error?: unknown } } }).response?.data?.error;
    if (typeof apiMessage === 'string' && apiMessage) return apiMessage;
    if (error instanceof Error && error.message && error.name !== 'AxiosError') return error.message;
  }
  return fallback;
}
