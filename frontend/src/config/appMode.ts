/**
 * Modo de execução do frontend.
 *
 * - Modo demonstração (padrão): dados fictícios salvos apenas no navegador
 *   (localStorage). Nenhuma requisição é feita a backend.
 * - Modo API: defina VITE_DEMO_MODE=false e VITE_API_URL para usar o backend real.
 *
 * O padrão é demonstração porque ainda não existe backend publicado.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
