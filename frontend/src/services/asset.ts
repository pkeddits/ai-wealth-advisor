import api from './api';
import type { Asset, MarketQuote, Candle, Fundamentals, PaginatedResponse } from '../types';

export interface CreateAssetRequest {
  symbol: string;
  name: string;
  class: 'acoes' | 'fiis' | 'etfs' | 'renda_fixa' | 'cripto' | 'internacional';
  sector?: string;
  country: string;
  exchange: string;
  currency: string;
}

export const assetService = {
  list: async (params?: { 
    class?: string; 
    country?: string; 
    search?: string; 
    page?: number; 
    limit?: number 
  }): Promise<PaginatedResponse<Asset>> => {
    const response = await api.get('/assets', { params });
    return response.data;
  },
  
  search: async (query: string): Promise<Asset[]> => {
    const response = await api.get('/assets/search', { params: { q: query } });
    return response.data;
  },
  
  get: async (id: string): Promise<Asset> => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },
  
  create: async (data: CreateAssetRequest): Promise<Asset> => {
    const response = await api.post('/assets', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<CreateAssetRequest>): Promise<Asset> => {
    const response = await api.put(`/assets/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/assets/${id}`);
  },
  
  getPrices: async (id: string, params?: { days?: number }): Promise<Candle[]> => {
    const response = await api.get(`/assets/${id}/prices`, { params });
    return response.data;
  },
  
  getQuote: async (symbol: string): Promise<MarketQuote> => {
    const response = await api.get(`/market/quote/${symbol}`);
    return response.data;
  },
  
  getCandles: async (symbol: string, interval: string = '1d', days: number = 30): Promise<Candle[]> => {
    const response = await api.get(`/market/candles/${symbol}`, { params: { interval, days } });
    return response.data;
  },
  
  getFundamentals: async (symbol: string): Promise<Fundamentals> => {
    const response = await api.get(`/market/fundamentals/${symbol}`);
    return response.data;
  },
};

export default assetService;
