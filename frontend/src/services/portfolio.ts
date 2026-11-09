import api from './api';
import type { Portfolio, Position, Transaction, PaginatedResponse } from '../types';

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
}

export interface CreateTransactionRequest {
  portfolioId: string;
  assetId: string;
  type: 'compra' | 'venda';
  quantity: number;
  price: number;
  fees: number;
  date: string;
}

export const portfolioService = {
  list: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Portfolio>> => {
    const response = await api.get('/portfolios', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<Portfolio> => {
    const response = await api.get(`/portfolios/${id}`);
    return response.data;
  },
  
  create: async (data: CreatePortfolioRequest): Promise<Portfolio> => {
    const response = await api.post('/portfolios', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<CreatePortfolioRequest>): Promise<Portfolio> => {
    const response = await api.put(`/portfolios/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/portfolios/${id}`);
  },
  
  getSummary: async (id: string): Promise<any> => {
    const response = await api.get(`/portfolios/${id}/summary`);
    return response.data;
  },
  
  getPositions: async (id: string): Promise<Position[]> => {
    const response = await api.get(`/portfolios/${id}/positions`);
    return response.data;
  },
  
  getTransactions: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get(`/portfolios/${id}/transactions`, { params });
    return response.data;
  },
  
  getPerformance: async (id: string, period?: string): Promise<any> => {
    const response = await api.get(`/portfolios/${id}/performance`, { params: { period } });
    return response.data;
  },
  
  getAllocation: async (id: string): Promise<any> => {
    const response = await api.get(`/portfolios/${id}/allocation`);
    return response.data;
  },
  
  getRebalanceSuggestions: async (id: string): Promise<any> => {
    const response = await api.get(`/portfolios/${id}/rebalance`);
    return response.data;
  },
  
  createTransaction: async (data: CreateTransactionRequest): Promise<Transaction> => {
    const response = await api.post('/transactions', data);
    return response.data;
  },
  
  getByPortfolio: async (portfolioId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get(`/portfolios/${portfolioId}/transactions`, { params });
    return response.data;
  },
};
