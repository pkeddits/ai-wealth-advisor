// AI Wealth Advisor - TypeScript Types
// Matches backend Go models exactly

// ==================== AUTH ====================

export interface User {
  id: string;
  name: string;
  email: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ==================== ASSETS ====================

export type AssetClass = 'acoes' | 'fiis' | 'etfs' | 'renda_fixa' | 'cripto' | 'internacional';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  class: AssetClass;
  sector?: string;
  country: string;
  exchange: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  symbol: string;
  name: string;
  class: AssetClass;
  sector?: string;
  country: string;
  exchange: string;
  currency: string;
}

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  symbol: string;
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  beta?: number;
  eps?: number;
  revenue?: number;
  profitMargin?: number;
  roe?: number;
  debtToEquity?: number;
  currentRatio?: number;
  freeCashFlow?: number;
  enterpriseValue?: number;
  trailingPE?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToSales?: number;
  priceToBook?: number;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;
}

// ==================== PORTFOLIO ====================

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
  /** Valor de mercado; null quando alguma posição não tem cotação disponível. */
  totalValue: number | null;
  totalInvested: number;
  totalReturn: number | null;
  totalReturnPct: number | null;
  createdAt: string;
  updatedAt: string;
  positions?: Position[];
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
}

export interface Position {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: Asset;
  quantity: number;
  averagePrice: number;
  /** null quando não há cotação de mercado para o ativo. */
  currentPrice: number | null;
  currentValue: number | null;
  investedValue: number;
  unrealizedGain: number | null;
  unrealizedGainPct: number | null;
  /** Participação na carteira, pelo valor de mercado ou, sem cotação, pelo custo. */
  allocation: number;
  updatedAt: string;
}

// ==================== TRANSACTIONS ====================

export type TransactionType = 'compra' | 'venda';

export interface Transaction {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: Asset;
  type: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkImportResult {
  imported: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

// ==================== MARKET DATA ====================

export interface MarketData {
  id: string;
  assetId: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

// ==================== AI ====================

export type AIAction = 'buy' | 'sell' | 'hold';

export interface Recommendation {
  id: string;
  portfolioId: string;
  assetId: string;
  asset?: Asset;
  action: AIAction;
  quantity: number;
  targetPrice: number;
  confidence: number;
  rationale: string;
  timeframe: string;
  status: 'pending' | 'executed' | 'dismissed' | 'expired';
  createdAt: string;
  executedAt?: string;
}

export interface PortfolioAnalysis {
  riskScore: number;
  diversificationScore: number;
  suggestions: string[];
  sectorAllocation: Record<string, number>;
  geographicAllocation: Record<string, number>;
  classAllocation: Record<string, number>;
  concentrationRisk: {
    top5Concentration: number;
    top10Concentration: number;
    hhiIndex: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

// ==================== SENTIMENT ====================

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface MarketSentiment {
  id: string;
  date: string;
  fearGreedIndex: number;
  fearGreedLabel: string;
  vix?: number;
  putCallRatio?: number;
  marketBreadth?: number;
  createdAt: string;
}

export interface NewsSentiment {
  id: string;
  assetId?: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  sentiment: SentimentLabel;
  sentimentScore: number;
  publishedAt: string;
  asset?: Asset;
}

export interface SocialSentiment {
  id: string;
  assetId?: string;
  platform: 'twitter' | 'reddit' | 'stocktwits';
  mentions: number;
  sentiment: SentimentLabel;
  sentimentScore: number;
  trendingScore?: number;
  date: string;
  asset?: Asset;
}

// ==================== SIMULATIONS ====================

export type SimulationType = 'monte_carlo' | 'historical' | 'stress_test';
export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Simulation {
  id: string;
  portfolioId: string;
  name: string;
  type: SimulationType;
  status: SimulationStatus;
  parameters: SimulationParameters;
  results?: SimulationResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface SimulationParameters {
  timeHorizon: number;
  numSimulations: number;
  confidenceLevel: number;
  stressScenarios?: StressScenario[];
}

export interface StressScenario {
  name: string;
  description: string;
  marketShock: number;
  correlationShock: number;
  volatilityMultiplier: number;
}

export interface SimulationResult {
  expectedReturn: number;
  worstCase: number;
  bestCase: number;
  percentile5: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile95: number;
  probabilityOfLoss: number;
  probabilityOfGain: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  var95: number;
  var99: number;
  cvar95: number;
  paths?: number[][];
  finalValues?: number[];
}

// ==================== ALERTS ====================

export type AlertType = 
  | 'price_above'
  | 'price_below'
  | 'percent_change'
  | 'volume_spike'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'macd_cross'
  | 'portfolio_value'
  | 'drawdown'
  | 'concentration'
  | 'news_sentiment';

export type AlertCondition = 'above' | 'below' | 'crosses_up' | 'crosses_down';

export interface Alert {
  id: string;
  portfolioId: string;
  name: string;
  type: AlertType;
  assetId?: string;
  asset?: Asset;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
  triggeredAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  alert?: Alert;
  portfolioId: string;
  assetId?: string;
  asset?: Asset;
  value: number;
  threshold: number;
  message: string;
  triggeredAt: string;
  acknowledgedAt?: string;
}

// ==================== COMMON ====================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: Record<string, string>;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    openai: 'up' | 'down';
    marketData: 'up' | 'down';
  };
}

// ==================== FORM TYPES ====================

export interface FormFieldError {
  field: string;
  message: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

// ==================== CHART DATA ====================

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AllocationDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface CorrelationDataPoint {
  asset: string;
  correlations: Record<string, number>;
}
