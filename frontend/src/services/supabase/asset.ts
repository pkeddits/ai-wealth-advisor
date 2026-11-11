import type { assetService as apiAssetService } from '../asset';
import { getSupabase } from '../../lib/supabase';
import { FeatureUnavailableError } from '../unavailable';
import { dbError } from './errors';
import { ASSET_COLUMNS, toAsset, type AssetRow } from './mappers';

async function fetchAssets(search?: string, assetClass?: string) {
  let query = getSupabase().from('assets').select(ASSET_COLUMNS).eq('is_active', true).order('symbol');
  if (assetClass) query = query.eq('asset_class', assetClass);
  const term = search?.trim().replace(/[%,()]/g, '');
  if (term) query = query.or(`symbol.ilike.%${term}%,name.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw dbError(error, 'Não foi possível carregar os ativos.');
  return ((data ?? []) as AssetRow[]).map(toAsset);
}

export const supabaseAssetService: typeof apiAssetService = {
  list: async (params) => {
    const items = await fetchAssets(params?.search, params?.class);
    return { data: items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
  },
  search: async (query) => fetchAssets(query),
  get: async (id) => {
    const { data, error } = await getSupabase().from('assets').select(ASSET_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw dbError(error, 'Não foi possível carregar o ativo.');
    if (!data) throw new Error('Ativo não encontrado.');
    return toAsset(data as AssetRow);
  },
  create: async () => { throw new FeatureUnavailableError('Cadastro de ativos'); },
  update: async () => { throw new FeatureUnavailableError('Edição de ativos'); },
  delete: async () => { throw new FeatureUnavailableError('Exclusão de ativos'); },
  getPrices: async () => { throw new FeatureUnavailableError('Histórico de preços'); },
  getQuote: async () => { throw new FeatureUnavailableError('Cotações'); },
  getCandles: async () => { throw new FeatureUnavailableError('Gráfico de candles'); },
  getFundamentals: async () => { throw new FeatureUnavailableError('Indicadores fundamentalistas'); },
};
