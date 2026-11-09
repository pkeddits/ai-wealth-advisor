import type { assetService as apiAssetService } from '../asset';
import { DEMO_ASSETS, findDemoAsset } from './catalog';
import { paginate } from './core';
import { DemoUnavailableError } from './storage';

export const demoAssetService: typeof apiAssetService = {
  list: async (params) => {
    const q = params?.search?.toLowerCase();
    const items = DEMO_ASSETS.filter(
      (a) => (!params?.class || a.class === params.class) && (!q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)),
    );
    return paginate(items);
  },
  search: async (query) => {
    const q = query.toLowerCase();
    return DEMO_ASSETS.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  },
  get: async (id) => {
    const a = findDemoAsset(id);
    if (!a) throw new Error('Ativo não encontrado.');
    return a;
  },
  create: async () => { throw new DemoUnavailableError('Cadastro de ativos'); },
  update: async () => { throw new DemoUnavailableError('Edição de ativos'); },
  delete: async () => { throw new DemoUnavailableError('Exclusão de ativos'); },
  getPrices: async () => { throw new DemoUnavailableError('Histórico de preços'); },
  getQuote: async () => { throw new DemoUnavailableError('Cotações em tempo real'); },
  getCandles: async () => { throw new DemoUnavailableError('Gráfico de candles'); },
  getFundamentals: async () => { throw new DemoUnavailableError('Indicadores fundamentalistas'); },
};
