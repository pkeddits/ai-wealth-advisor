import api from './api';
import type { Transaction, PaginatedResponse } from '../types';

export interface CreateTransactionRequest {
  portfolioId: string;
  assetId: string;
  type: 'compra' | 'venda';
  quantity: number;
  price: number;
  fees: number;
  date: string;
}

export const transactionService = {
  list: async (params?: { portfolioId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<Transaction> => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },
  
  create: async (data: CreateTransactionRequest): Promise<Transaction> => {
    const response = await api.post('/transactions', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<CreateTransactionRequest>): Promise<Transaction> => {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },
  
  bulkImport: async (portfolioId: string, file: File): Promise<{ imported: number; errors: any[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('portfolioId', portfolioId);
    const response = await api.post('/transactions/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  exportCSV: async (portfolioId?: string): Promise<Blob> => {
    const response = await api.get('/transactions/export', {
      params: { portfolioId },
      responseType: 'blob',
    });
    return response.data;
  },
};
