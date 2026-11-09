import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, Filter } from 'lucide-react';
import { analyticsService } from '../services';
import { usePortfolioStore } from '../store/portfolioStore';
import { Card, CardBody, Button, Select, Input, LoadingSpinner, Badge } from '../components/common';
import { formatCurrency, formatPercent } from '../utils/format';
import clsx from 'clsx';

interface AnalyticsData {
  returns: { date: string; value: number }[];
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  var95: number;
  correlationMatrix: { asset: string; correlations: Record<string, number> }[];
}

export function AnalyticsPage() {
  const { currentPortfolio } = usePortfolioStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState('1y');
  const [benchmark, setBenchmark] = useState('ibov');

  const loadAnalytics = async () => {
    if (!currentPortfolio) return;
    setIsLoading(true);
    try {
      const data = await analyticsService.getAnalytics(currentPortfolio.id, period, benchmark);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentPortfolio, period, benchmark]);

  if (!currentPortfolio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Analytics
          </h1>
          <p className="text-dark-600 mt-1">Análise de risco e retorno da sua carteira</p>
        </div>
        <Card>
          <CardBody className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-900 mb-2">Selecione uma carteira</h2>
            <p className="text-dark-600">Escolha uma carteira no menu lateral para ver a análise completa</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Analytics
          </h1>
          <p className="text-dark-600 mt-1">Análise de risco e retorno de {currentPortfolio.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: '1m', label: '1 Mês' },
              { value: '3m', label: '3 Meses' },
              { value: '6m', label: '6 Meses' },
              { value: '1y', label: '1 Ano' },
              { value: '3y', label: '3 Anos' },
              { value: '5y', label: '5 Anos' },
            ]}
            className="w-40"
          />
          <Select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            options={[
              { value: 'ibov', label: 'IBOVESPA' },
              { value: 'cdi', label: 'CDI' },
              { value: 'sp500', label: 'S&P 500' },
            ]}
            className="w-40"
          />
          <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics && [
          { label: 'Volatilidade (anual)', value: `${(analytics.volatility * 100).toFixed(2)}%`, icon: TrendingUp, color: 'blue' },
          { label: 'Sharpe Ratio', value: analytics.sharpeRatio.toFixed(2), icon: BarChart3, color: 'green' },
          { label: 'Max Drawdown', value: `${(analytics.maxDrawdown * 100).toFixed(2)}%`, icon: TrendingUp, color: 'red' },
          { label: 'Beta vs Benchmark', value: analytics.beta.toFixed(2), icon: BarChart3, color: 'purple' },
        ].map((metric, i) => (
          <Card key={i}>
            <CardBody className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-500">{metric.label}</p>
                  <p className="text-2xl font-bold text-dark-900 mt-1">{metric.value}</p>
                </div>
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', `bg-${metric.color}-100`)}>
                  <metric.icon className={clsx('w-5 h-5', `text-${metric.color}-600`)} />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Additional Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody className="p-5">
              <p className="text-sm text-dark-500">VaR 95% (1 dia)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(Math.abs(analytics.var95))}</p>
              <p className="text-sm text-dark-500 mt-1">Perda máxima esperada em 95% dos dias</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-5">
              <p className="text-sm text-dark-500">Retorno Acumulado ({period})</p>
              <p className="text-2xl font-bold text-dark-900 mt-1">
                {analytics.returns.length > 0 
                  ? formatPercent((analytics.returns[analytics.returns.length - 1].value - analytics.returns[0].value) / analytics.returns[0].value)
                  : 'N/A'}
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody className="p-5">
            <h3 className="text-lg font-semibold text-dark-900 mb-4">Evolução do Patrimônio</h3>
            <div className="h-80 bg-dark-50 rounded-lg flex items-center justify-center">
              {isLoading ? (
                <LoadingSpinner size="lg" />
              ) : analytics ? (
                <span className="text-dark-400">Gráfico de linha (Recharts) - {analytics.returns.length} pontos de dados</span>
              ) : (
                <span className="text-dark-400">Carregando...</span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <h3 className="text-lg font-semibold text-dark-900 mb-4">Drawdown</h3>
            <div className="h-80 bg-dark-50 rounded-lg flex items-center justify-center">
              <span className="text-dark-400">Gráfico de drawdown (Recharts)</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Correlation Matrix */}
      {analytics && analytics.correlationMatrix.length > 0 && (
        <Card>
          <CardBody className="p-5">
            <h3 className="text-lg font-semibold text-dark-900 mb-4">Matriz de Correlação</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-200">
                    <th className="text-left p-3 font-medium text-dark-500">Ativo</th>
                    {analytics.correlationMatrix.map((row) => (
                      <th key={row.asset} className="text-center p-3 font-medium text-dark-500">{row.asset}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.correlationMatrix.map((row) => (
                    <tr key={row.asset} className="border-b border-dark-100">
                      <td className="p-3 font-medium text-dark-900">{row.asset}</td>
                      {analytics.correlationMatrix.map((col) => (
                        <td key={col.asset} className="text-center p-3">
                          <span className={clsx(
                            'font-medium',
                            row.correlations[col.asset] > 0.7 ? 'text-red-600' :
                            row.correlations[col.asset] > 0.3 ? 'text-yellow-600' : 'text-green-600'
                          )}>
                            {(row.correlations[col.asset] * 100).toFixed(0)}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
