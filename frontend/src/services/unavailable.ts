export class FeatureUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} ainda não está disponível nesta versão.`);
    this.name = 'FeatureUnavailableError';
  }
}

/**
 * Service cujos métodos sempre falham com uma mensagem explícita. Usado no modo
 * Supabase para módulos ainda não migrados, evitando cair na API Go ou em dados fictícios.
 */
export function unavailableService<T extends object>(feature: string): T {
  return new Proxy({} as T, {
    get: () => async () => {
      throw new FeatureUnavailableError(feature);
    },
  });
}
