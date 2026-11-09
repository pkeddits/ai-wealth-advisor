import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Bot, AlertTriangle, Plus, BarChart3, RefreshCw, Layers } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { aiService } from '../services';
import { loadDemoSample } from '../services/demo';
import { isDemoMode } from '../config/appMode';
import { riskProfileLabel } from '../utils/labels';
import { Card, CardBody, Button, LoadingSpinner } from '../components/common';
import clsx from 'clsx';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { portfolios, currentPortfolio, fetchPortfolios, selectPortfolio, error } = usePortfolioStore();
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  // Usa sempre a versão mais recente da lista (com posições e totais atualizados).
  const selectedPortfolio = portfolios.find((p) => p.id === currentPortfolio?.id) ?? portfolios[0] ?? null;

  useEffect(() => {
    // No modo demonstração não há IA: não fazemos requisição nem exibimos conteúdo simulado.
    if (selectedPortfolio && !isDemoMode) {
      loadAIInsights(selectedPortfolio.id);
    }
  }, [selectedPortfolio?.id]);

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const id = await loadDemoSample();
      await fetchPortfolios();
      navigate(`/portfolios/${id}`);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const loadAIInsights = async (portfolioId: string) => {
    setIsLoadingInsights(true);
    try {
      const insights = await aiService.getPortfolioInsights(portfolioId);
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const totalValue = portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0);
  const totalReturn = portfolios.reduce((sum, p) => sum + (p.totalReturn || 0), 0);
  const totalReturnPct = totalValue > 0 ? (totalReturn / (totalValue - totalReturn)) * 100 : 0;
  const distinctAssets = new Set(portfolios.flatMap((p) => (p.positions ?? []).map((pos) => pos.assetId))).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Olá, {user?.name?.split(' ')[0] || 'Investidor'}!</h1>
          <p className="text-dark-600 mt-1">Acompanhe o desempenho dos seus investimentos</p>
        </div>
        <Button onClick={() => fetchPortfolios()} variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
          Não foi possível carregar as carteiras: {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Valor Total</p>
                <p className="text-2xl font-bold text-dark-900 mt-1">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Retorno Total</p>
                <p className={clsx('text-2xl font-bold mt-1', totalReturn >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {totalReturn >= 0 ? '+' : ''}R$ {Math.abs(totalReturn).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className={clsx('text-sm mt-1', totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600')}>
              {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}%
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Carteiras</p>
                <p className="text-2xl font-bold text-dark-900 mt-1">{portfolios.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">Ativos em carteira</p>
                <p className="text-2xl font-bold text-dark-900 mt-1">{distinctAssets}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Selection & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {portfolios.length > 0 ? (
            <>
              <Card>
                <CardBody className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-dark-900">Minhas Carteiras</h2>
                    <Link to="/portfolios?nova=1">
                      <Button size="sm" icon={<Plus className="w-4 h-4" />}>
                        Nova Carteira
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {portfolios.map((portfolio) => (
                      <div
                        key={portfolio.id}
                        onClick={() => selectPortfolio(portfolio)}
                        className={clsx(
                          'p-4 rounded-lg border cursor-pointer transition-colors',
                          selectedPortfolio?.id === portfolio.id
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-dark-200 hover:bg-dark-50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-medium text-dark-900">{portfolio.name}</p>
                              <p className="text-sm text-dark-500">{riskProfileLabel(portfolio.riskProfile)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-dark-900">
                              R$ {(portfolio.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className={clsx('text-sm', (portfolio.totalReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {(portfolio.totalReturnPct || 0) >= 0 ? '+' : ''}{(portfolio.totalReturnPct || 0).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {selectedPortfolio && (
                <>
                  <Card>
                    <CardBody className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-dark-900">Principais posições</h2>
                          <p className="text-sm text-dark-500">{selectedPortfolio.name}</p>
                        </div>
                        <Link to={`/portfolios/${selectedPortfolio.id}`} className="text-sm text-primary-600 hover:underline">
                          Abrir carteira
                        </Link>
                      </div>
                      <div className="space-y-3">
                        {selectedPortfolio.positions?.slice(0, 5).map((position: any) => (
                          <div key={position.assetId} className="flex items-center justify-between p-3 bg-dark-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-primary-600" />
                              </div>
                              <div>
                                <p className="font-medium text-dark-900">{position.asset?.symbol}</p>
                                <p className="text-sm text-dark-500">{position.asset?.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-dark-900">
                                R$ {position.currentValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className={clsx('text-sm', (position.unrealizedGainPct || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                                {(position.unrealizedGainPct || 0) >= 0 ? '+' : ''}{(position.unrealizedGainPct || 0).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!selectedPortfolio.positions || selectedPortfolio.positions.length === 0) && (
                          <div className="text-center py-8 text-dark-500">
                            <p>Nenhuma posição nesta carteira</p>
                            <Link to={`/portfolios/${selectedPortfolio.id}`} className="text-primary-600 hover:underline mt-2 inline-block">
                              Registrar uma compra
                            </Link>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </>
              )}
            </>
          ) : (
            <Card>
              <CardBody className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-dark-900 mb-2">Nenhuma carteira criada</h2>
                <p className="text-dark-600 mb-6">Crie sua primeira carteira e registre suas compras para acompanhar o patrimônio.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/portfolios?nova=1">
                    <Button size="lg" icon={<Plus className="w-4 h-4" />}>
                      Criar carteira
                    </Button>
                  </Link>
                  {isDemoMode && (
                    <Button size="lg" variant="secondary" onClick={handleLoadSample} loading={isLoadingSample}>
                      Carregar carteira de exemplo
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar - AI Insights & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-dark-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary-600" />
                  Insights da IA
                </h2>
              </div>
              {isDemoMode ? (
                <div className="text-center py-4 text-dark-500">
                  <p>A análise com IA está em desenvolvimento e não faz parte desta demonstração.</p>
                </div>
              ) : isLoadingInsights ? (
                <LoadingSpinner />
              ) : aiInsights ? (
                <div className="space-y-3">
                  {aiInsights.insights?.slice(0, 3).map((insight: any, i: number) => (
                    <div key={i} className="p-3 bg-primary-50 rounded-lg border border-primary-100">
                      <p className="text-sm text-dark-700">{insight}</p>
                    </div>
                  ))}
                  <Link to="/ai-analysis" className="text-sm text-primary-600 hover:underline block text-center mt-2">
                    Ver análise completa →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4 text-dark-500">
                  <p>Selecione uma carteira para ver insights</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <h2 className="text-lg font-semibold text-dark-900 mb-4">Ações Rápidas</h2>
              <div className="space-y-2">
                <Link to="/portfolios?nova=1" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-3" icon={<Plus className="w-4 h-4" />}>
                    Nova Carteira
                  </Button>
                </Link>
                {selectedPortfolio && (
                  <Link to={`/portfolios/${selectedPortfolio.id}`} className="block">
                    <Button variant="secondary" className="w-full justify-start gap-3" icon={<Wallet className="w-4 h-4" />}>
                      Registrar transação
                    </Button>
                  </Link>
                )}
                {!isDemoMode && (<>
                <Link to="/ai-analysis" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-3" icon={<Bot className="w-4 h-4" />}>
                    Análise com IA
                  </Button>
                </Link>
                <Link to="/alerts" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-3" icon={<AlertTriangle className="w-4 h-4" />}>
                    Configurar Alertas
                  </Button>
                </Link>
                <Link to="/simulations" className="block">
                  <Button variant="secondary" className="w-full justify-start gap-3" icon={<TrendingUp className="w-4 h-4" />}>
                    Simular Cenários
                  </Button>
                </Link>
                </>)}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
