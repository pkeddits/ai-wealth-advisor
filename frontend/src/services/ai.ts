import api from './api';
import type { Recommendation, PortfolioAnalysis } from '../types';

export const aiService = {
  getRecommendations: async (portfolioId: string): Promise<Recommendation[]> => {
    const response = await api.post('/ai/recommendations', { portfolio_id: portfolioId });
    return response.data;
  },
  
  analyzePortfolio: async (portfolioId: string): Promise<PortfolioAnalysis> => {
    const response = await api.post('/ai/analyze', { portfolio_id: portfolioId });
    return response.data;
  },
  
  getPortfolioInsights: async (portfolioId: string): Promise<{ insights: string[] }> => {
    const response = await api.post('/ai/insights', { portfolio_id: portfolioId });
    return response.data;
  },
  
  chat: async (portfolioId: string, message: string): Promise<{ message: string; suggestions?: any[] }> => {
    const response = await api.post('/ai/chat', { portfolio_id: portfolioId, message });
    return response.data;
  },
  
  streamChat: async (portfolioId: string, message: string, onChunk: (chunk: string) => void): Promise<void> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ portfolio_id: portfolioId, message }),
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        onChunk(chunk);
      }
    }
  },
};
