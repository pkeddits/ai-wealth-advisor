import api from './api';
import type { Alert, AlertHistory } from '../types';

export interface CreateAlertRequest {
  name: string;
  type: string;
  assetId?: string;
  condition: string;
  threshold: number;
  enabled: boolean;
}

export const alertService = {
  list: async (portfolioId: string): Promise<Alert[]> => {
    const response = await api.get('/alerts', { params: { portfolio_id: portfolioId } });
    return response.data;
  },
  
  get: async (id: string): Promise<Alert> => {
    const response = await api.get(`/alerts/${id}`);
    return response.data;
  },
  
  create: async (portfolioId: string, data: CreateAlertRequest): Promise<Alert> => {
    const response = await api.post('/alerts', { ...data, portfolio_id: portfolioId });
    return response.data;
  },
  
  update: async (id: string, data: Partial<CreateAlertRequest>): Promise<Alert> => {
    const response = await api.put(`/alerts/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/alerts/${id}`);
  },
  
  test: async (id: string): Promise<{ triggered: boolean; message: string }> => {
    const response = await api.post(`/alerts/${id}/test`);
    return response.data;
  },
  
  getHistory: async (alertId?: string): Promise<AlertHistory[]> => {
    const response = await api.get('/alerts/history', { params: { alert_id: alertId } });
    return response.data;
  },
};
