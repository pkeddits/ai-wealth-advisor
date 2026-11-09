import api from './api';
import type { Simulation } from '../types';

export interface CreateSimulationRequest {
  name: string;
  type: 'monte_carlo' | 'historical' | 'stress_test';
  timeHorizon: number;
  numSimulations: number;
  confidenceLevel: number;
}

export const simulationService = {
  list: async (portfolioId: string): Promise<Simulation[]> => {
    const response = await api.get('/simulations', { params: { portfolio_id: portfolioId } });
    return response.data;
  },
  
  get: async (id: string): Promise<Simulation> => {
    const response = await api.get(`/simulations/${id}`);
    return response.data;
  },
  
  create: async (portfolioId: string, data: CreateSimulationRequest): Promise<Simulation> => {
    const response = await api.post('/simulations', { ...data, portfolio_id: portfolioId });
    return response.data;
  },
  
  run: async (id: string): Promise<Simulation> => {
    const response = await api.post(`/simulations/${id}/run`);
    return response.data;
  },
  
  getResults: async (id: string): Promise<any> => {
    const response = await api.get(`/simulations/${id}/results`);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/simulations/${id}`);
  },
};
