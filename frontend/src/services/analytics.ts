import api from './api';

export interface AnalyticsData {
  returns: { date: string; value: number }[];
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  var95: number;
  correlationMatrix: { asset: string; correlations: Record<string, number> }[];
}

export const analyticsService = {
  getAnalytics: async (portfolioId: string, period: string = '1y', benchmark: string = 'ibov'): Promise<AnalyticsData> => {
    const response = await api.get(`/analytics/${portfolioId}`, { params: { period, benchmark } });
    return response.data;
  },
  
  getReturns: async (portfolioId: string, period: string = '1y'): Promise<{ date: string; value: number }[]> => {
    const response = await api.get(`/analytics/${portfolioId}/returns`, { params: { period } });
    return response.data;
  },
  
  getRiskMetrics: async (portfolioId: string): Promise<any> => {
    const response = await api.get(`/analytics/${portfolioId}/risk`);
    return response.data;
  },
};
