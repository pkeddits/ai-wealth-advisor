import { useState, useEffect } from 'react';
import { Bot, Sparkles, MessageSquare, Loader2, Send, Copy, Check, PieChart } from 'lucide-react';
import { aiService } from '../services';
import { Card, CardBody, Button, Input, Badge, LoadingSpinner } from '../components/common';
import { usePortfolioStore } from '../store/portfolioStore';
import { formatPercent } from '../utils/format';
import clsx from 'clsx';

interface Recommendation {
  id: string;
  action: 'buy' | 'sell' | 'hold';
  asset: { symbol: string; name: string };
  quantity: number;
  targetPrice: number;
  confidence: number;
  rationale: string;
  timeframe: string;
}

interface PortfolioAnalysis {
  riskScore: number;
  diversificationScore: number;
  suggestions: string[];
}

export function AIAnalysisPage() {
  const { currentPortfolio } = usePortfolioStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'analysis' | 'chat'>('recommendations');
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const loadRecommendations = async () => {
    if (!currentPortfolio) return;
    setIsLoading(true);
    try {
      const data = await aiService.getRecommendations(currentPortfolio.id);
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalysis = async () => {
    if (!currentPortfolio) return;
    setIsLoading(true);
    try {
      const data = await aiService.analyzePortfolio(currentPortfolio.id);
      setAnalysis(data);
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInsights = async () => {
    if (!currentPortfolio) return;
    try {
      const data = await aiService.getPortfolioInsights(currentPortfolio.id);
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  useEffect(() => {
    if (currentPortfolio) {
      loadRecommendations();
      loadAnalysis();
      loadInsights();
    }
  }, [currentPortfolio]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentPortfolio) return;
    const userMessage = chatInput;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const response = await aiService.chat(currentPortfolio.id, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar mensagem. Tente novamente.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary-600" />
            Análise com IA
          </h1>
          <p className="text-dark-600 mt-1">Insights e recomendações inteligentes para sua carteira</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadRecommendations} loading={isLoading} icon={<Loader2 className="w-4 h-4" />}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Portfolio Selector Warning */}
      {!currentPortfolio && (
        <Card>
          <CardBody className="p-6 text-center">
            <Bot className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-900 mb-2">Selecione uma carteira</h2>
            <p className="text-dark-600 mb-4">A IA precisa de uma carteira ativa para gerar recomendações personalizadas</p>
          </CardBody>
        </Card>
      )}

      {currentPortfolio && (
        <>
          {/* Tabs */}
          <div className="border-b border-dark-200">
            <nav className="flex gap-4" aria-label="AI Analysis Tabs">
              {[
                              { id: 'recommendations', label: 'Recomendações', icon: Sparkles },
                              { id: 'analysis', label: 'Análise da Carteira', icon: Bot },
                              { id: 'chat', label: 'Chat com IA', icon: MessageSquare },
                            ].map((tab) => {
                              const Icon = tab.icon;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => setActiveTab(tab.id as any)}
                                  className={clsx(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                                    activeTab === tab.id
                                      ? 'border-primary-500 text-primary-600'
                                      : 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300'
                                  )}
                                >
                                  <Icon className="w-4 h-4" />
                                  {tab.label}
                                </button>
                              );
                            })}
            </nav>
          </div>

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : recommendations.length === 0 ? (
                <Card>
                  <CardBody className="p-8 text-center">
                    <Sparkles className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-dark-900 mb-2">Nenhuma recomendação no momento</h3>
                    <p className="text-dark-600">A IA não encontrou oportunidades claras para sua carteira atual</p>
                  </CardBody>
                </Card>
              ) : (
                recommendations.map((rec) => (
                  <Card key={rec.id}>
                    <CardBody className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={clsx(
                            'w-12 h-12 rounded-xl flex items-center justify-center',
                            rec.action === 'buy' ? 'bg-green-100' : rec.action === 'sell' ? 'bg-red-100' : 'bg-blue-100'
                          )}>
                            <span className={clsx('font-bold text-lg', rec.action === 'buy' ? 'text-green-600' : rec.action === 'sell' ? 'text-red-600' : 'text-blue-600')}>
                              {rec.action === 'buy' ? 'C' : rec.action === 'sell' ? 'V' : 'M'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-dark-900">{rec.asset.symbol} - {rec.asset.name}</p>
                            <p className="text-sm text-dark-500">{rec.action === 'buy' ? 'Comprar' : rec.action === 'sell' ? 'Vender' : 'Manter'} {rec.quantity} unidades a {rec.targetPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={rec.confidence > 0.7 ? 'green' : rec.confidence > 0.4 ? 'yellow' : 'gray'}>
                            Confiança: {Math.round(rec.confidence * 100)}%
                          </Badge>
                          <Badge variant="blue">{rec.timeframe}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-dark-50 rounded-lg">
                        <p className="text-sm text-dark-700">{rec.rationale}</p>
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {isLoading ? (
                <LoadingSpinner size="lg" className="mx-auto my-12" />
              ) : analysis && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardBody className="p-6">
                        <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary-600" />
                          Score de Risco
                        </h3>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-dark-900">{analysis.riskScore}/100</div>
                          <div className="mt-2 h-2 bg-dark-200 rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full transition-all', 
                              analysis.riskScore > 70 ? 'bg-red-500' : analysis.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'
                            )} style={{ width: `${analysis.riskScore}%` }} />
                          </div>
                          <p className="text-sm text-dark-500 mt-2">
                            {analysis.riskScore > 70 ? 'Alto risco' : analysis.riskScore > 40 ? 'Risco moderado' : 'Baixo risco'}
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody className="p-6">
                        <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                          <PieChart className="w-5 h-5 text-primary-600" />
                          Diversificação
                        </h3>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-dark-900">{analysis.diversificationScore}/100</div>
                          <div className="mt-2 h-2 bg-dark-200 rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full transition-all',
                              analysis.diversificationScore > 70 ? 'bg-green-500' : analysis.diversificationScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            )} style={{ width: `${analysis.diversificationScore}%` }} />
                          </div>
                          <p className="text-sm text-dark-500 mt-2">
                            {analysis.diversificationScore > 70 ? 'Bem diversificada' : analysis.diversificationScore > 40 ? 'Moderadamente diversificada' : 'Pouco diversificada'}
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  {analysis.suggestions && analysis.suggestions.length > 0 && (
                    <Card>
                      <CardBody className="p-5">
                        <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary-600" />
                          Sugestões da IA
                        </h3>
                        <ul className="space-y-3">
                          {analysis.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-primary-50 rounded-lg">
                              <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                              <p className="text-dark-700">{suggestion}</p>
                            </li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                  )}

                  {insights.length > 0 && (
                    <Card>
                      <CardBody className="p-5">
                        <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary-600" />
                          Insights de Mercado
                        </h3>
                        <ul className="space-y-3">
                          {insights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                              <Bot className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <p className="text-dark-700">{insight}</p>
                            </li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <Card className="flex flex-col h-[600px]">
              <CardBody className="p-0 flex-1 overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-dark-200">
                  <p className="text-sm text-dark-600">
                    Converse com a IA sobre sua carteira, mercado, estratégias, etc.
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-dark-500 py-12">
                      <Bot className="w-12 h-12 mx-auto mb-4 text-primary-600" />
                      <p>Como posso ajudar com seus investimentos hoje?</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : '')}>
                        <div
                          className={clsx(
                            'max-w-[80%] px-4 py-2 rounded-2xl',
                            msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-dark-100 text-dark-900 rounded-bl-none'
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="px-4 py-2 bg-dark-100 rounded-xl rounded-bl-none">
                        <LoadingSpinner size="sm" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-dark-200">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua pergunta..."
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!chatInput.trim() || isChatLoading} icon={<Send className="w-4 h-4" />} size="lg">
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
