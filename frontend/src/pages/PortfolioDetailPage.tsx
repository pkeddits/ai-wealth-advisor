import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { usePortfolioStore } from '../store/portfolioStore';
import { portfolioService, assetService } from '../services';
import { Card, CardBody, Button, Input, Select, Modal, Badge, LoadingSpinner, Table } from '../components/common';
import { formatCurrency } from '../utils/format';
import { assetClassLabel, riskProfileLabel, transactionTypeLabel } from '../utils/labels';
import { isDemoMode } from '../config/appMode';
import { demoPriceOf } from '../services/demo';
import clsx from 'clsx';

const CHART_COLORS = ['#0284c7', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0d9488'];
const today = () => new Date().toISOString().split('T')[0];

interface Position {
  id: string;
  asset?: { symbol: string; name: string; class: string };
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
  allocation: number;
}

export function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentPortfolio, positions, transactions, selectPortfolio, addTransaction } = usePortfolioStore();
  const [activeTab, setActiveTab] = useState<'positions' | 'transactions' | 'performance'>('positions');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const emptyForm = { assetId: '', type: 'compra', quantity: '', price: '', fees: '0', date: today() };
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Carrega a carteira pelo id da URL (antes só o id era repassado e nome/descrição ficavam vazios)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoadingPortfolio(true);
    setLoadError('');
    portfolioService
      .get(id)
      .then((p) => (cancelled ? undefined : selectPortfolio(p)))
      .catch(() => !cancelled && setLoadError('Carteira não encontrada.'))
      .finally(() => !cancelled && setIsLoadingPortfolio(false));
    loadAssets();
    return () => {
      cancelled = true;
    };
  }, [id, selectPortfolio]);

  const portfolio = currentPortfolio?.id === id ? currentPortfolio : null;

  const openTransactionModal = () => {
    setFormData(emptyForm);
    setFormError('');
    setIsTransactionModalOpen(true);
  };

  const handleAssetChange = (assetId: string) => {
    // No modo demonstração, sugere o preço fictício de referência do ativo
    const suggested = isDemoMode && assetId ? demoPriceOf(assetId) : 0;
    setFormData({ ...formData, assetId, price: suggested ? String(suggested) : formData.price });
  };

  const loadAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const response = await assetService.list({ limit: 100 });
      setAssets(response.data);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const quantity = parseFloat(formData.quantity);
    const price = parseFloat(formData.price);
    const fees = parseFloat(formData.fees || '0');
    if (!formData.assetId) return setFormError('Selecione um ativo.');
    if (!(quantity > 0)) return setFormError('Informe uma quantidade maior que zero.');
    if (!(price > 0)) return setFormError('Informe um preço maior que zero.');
    if (!(fees >= 0)) return setFormError('Taxas não podem ser negativas.');
    if (!formData.date) return setFormError('Informe a data.');
    setIsSaving(true);
    try {
      await addTransaction({ ...formData, portfolioId: portfolio?.id, quantity, price, fees });
      setIsTransactionModalOpen(false);
      setFormData(emptyForm);
    } catch (error: any) {
      setFormError(error?.response?.data?.error || error?.message || 'Não foi possível salvar a transação.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalGain = positions.reduce((sum, p) => sum + p.unrealizedGain, 0);
  const totalGainPct = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;

  const allocationByClass = Object.values(
    positions.reduce<Record<string, { name: string; value: number }>>((acc, p) => {
      const cls = p.asset?.class ?? 'outros';
      acc[cls] = acc[cls] ?? { name: assetClassLabel(cls), value: 0 };
      acc[cls].value += p.currentValue;
      return acc;
    }, {})
  );

  if (loadError) {
    return (
      <Card>
        <CardBody className="p-12 text-center">
          <h1 className="text-xl font-semibold text-dark-900 mb-2">{loadError}</h1>
          <p className="text-dark-600 mb-6">Ela pode ter sido apagada ou o endereço está incorreto.</p>
          <Link to="/portfolios">
            <Button>Ver minhas carteiras</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (isLoadingPortfolio || !portfolio) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/portfolios" className="text-sm text-dark-500 hover:underline mb-2 inline-block">
            ← Voltar às carteiras
          </Link>
          <h1 className="text-2xl font-bold text-dark-900">{portfolio.name}</h1>
          {portfolio.description && <p className="text-dark-600 mt-1">{portfolio.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={openTransactionModal} icon={<Plus className="w-4 h-4" />}>
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="p-5">
            <p className="text-sm text-dark-500">Valor Total</p>
            <p className="text-3xl font-bold text-dark-900 mt-1">{formatCurrency(totalValue)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <p className="text-sm text-dark-500">Ganho/Perda Não Realizado</p>
            <p className={clsx('text-3xl font-bold mt-1', totalGain >= 0 ? 'text-green-600' : 'text-red-600')}>
              {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
            </p>
            <p className={clsx('text-sm', totalGainPct >= 0 ? 'text-green-600' : 'text-red-600')}>
              {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <p className="text-sm text-dark-500">Perfil de Risco</p>
            <Badge variant="blue" className="text-lg px-4 py-2 mt-1 inline-block">
              {riskProfileLabel(portfolio.riskProfile)}
            </Badge>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {[
            { id: 'positions', label: 'Posições', icon: DollarSign },
            { id: 'transactions', label: 'Transações', icon: TrendingUp },
            { id: 'performance', label: 'Alocação', icon: PieChart },
          ].map((tab) => (
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
              <tab.icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'positions' && (
        <Card>
          <CardBody className="p-0">
            {positions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-dark-400" />
                </div>
                <h3 className="text-lg font-medium text-dark-900 mb-1">Nenhuma posição</h3>
                <p className="text-dark-500 mb-4">Adicione ativos à sua carteira</p>
                <Button onClick={openTransactionModal} icon={<Plus className="w-4 h-4" />}>
                  Registrar compra
                </Button>
              </div>
            ) : (
              <Table
                columns={[
                  { key: 'asset.symbol', header: 'Ativo', render: (row: Position) => (
                    <div>
                      <p className="font-medium text-dark-900">{row.asset?.symbol}</p>
                      <p className="text-sm text-dark-500">{row.asset?.name}</p>
                    </div>
                  )},
                  { key: 'asset.class', header: 'Classe', render: (row: Position) => (
                    <Badge variant="gray">{assetClassLabel(row.asset?.class)}</Badge>
                  )},
                  { key: 'quantity', header: 'Quantidade', render: (row: Position) => row.quantity.toLocaleString('pt-BR') },
                  { key: 'averagePrice', header: 'Preço Médio', render: (row: Position) => formatCurrency(row.averagePrice) },
                  { key: 'currentPrice', header: 'Preço Atual', render: (row: Position) => formatCurrency(row.currentPrice) },
                  { key: 'currentValue', header: 'Valor Atual', render: (row: Position) => formatCurrency(row.currentValue) },
                  { key: 'unrealizedGain', header: 'Ganho/Perda', render: (row: Position) => (
                    <span className={clsx('font-medium', row.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {row.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(row.unrealizedGain)}
                    </span>
                  )},
                  { key: 'unrealizedGainPct', header: '%', render: (row: Position) => (
                    <span className={clsx('font-medium', row.unrealizedGainPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {row.unrealizedGainPct >= 0 ? '+' : ''}{row.unrealizedGainPct.toFixed(2)}%
                    </span>
                  )},
                  { key: 'allocation', header: 'Alocação', render: (row: Position) => `${row.allocation.toFixed(1)}%` },
                ]}
                data={positions}
                keyExtractor={(row: Position) => row.id}
                isLoading={false}
                emptyMessage="Nenhuma posição encontrada"
              />
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardBody className="p-0">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-dark-500">Nenhuma transação realizada</p>
              </div>
            ) : (
              <Table
                columns={[
                  { key: 'date', header: 'Data', render: (row: any) => new Date(row.date).toLocaleDateString('pt-BR') },
                  { key: 'asset.symbol', header: 'Ativo', render: (row: any) => row.asset?.symbol },
                  { key: 'type', header: 'Tipo', render: (row: any) => (
                    <Badge variant={row.type === 'compra' ? 'green' : 'red'}>{transactionTypeLabel(row.type)}</Badge>
                  )},
                  { key: 'quantity', header: 'Quantidade', render: (row: any) => row.quantity.toLocaleString('pt-BR') },
                  { key: 'price', header: 'Preço', render: (row: any) => formatCurrency(row.price) },
                  { key: 'fees', header: 'Taxas', render: (row: any) => formatCurrency(row.fees) },
                  { key: 'total', header: 'Total', render: (row: any) => formatCurrency(row.total ?? row.quantity * row.price + row.fees) },
                ]}
                data={transactions}
                keyExtractor={(row: any) => row.id}
                isLoading={false}
              />
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'performance' && (
        <Card>
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-4">Alocação por classe</h3>
                {allocationByClass.length === 0 ? (
                  <div className="h-64 bg-dark-50 rounded-lg flex items-center justify-center text-center px-6">
                    <span className="text-dark-500">Registre uma compra para ver a distribuição da carteira.</span>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={allocationByClass} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                          {allocationByClass.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-4">Evolução do patrimônio</h3>
                <div className="h-64 bg-dark-50 rounded-lg flex items-center justify-center text-center px-6">
                  <span className="text-dark-500">Em desenvolvimento: depende do histórico de preços dos ativos.</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Transaction Modal */}
      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title="Nova Transação" size="md">
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <Select
            label="Ativo"
            placeholder="Selecione um ativo"
            options={assets.map(a => ({ value: a.id, label: `${a.symbol} - ${a.name}` }))}
            value={formData.assetId}
            onChange={(e) => handleAssetChange(e.target.value)}
            disabled={isLoadingAssets}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo"
              options={[
                { value: 'compra', label: 'Compra' },
                { value: 'venda', label: 'Venda' },
              ]}
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            />
            <Input
              label="Data"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              max={today()}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantidade"
              type="number"
              step="0.01"
              placeholder="100"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            />
            <Input
              label="Preço (R$)"
              type="number"
              step="0.01"
              placeholder="25.50"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              helperText={isDemoMode && formData.assetId ? 'Sugerido: preço fictício da demonstração' : undefined}
            />
          </div>
          <Input
            label="Taxas (R$)"
            type="number"
            step="0.01"
            placeholder="0"
            value={formData.fees}
            onChange={(e) => setFormData({...formData, fees: e.target.value})}
          />
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTransactionModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={isSaving}>
              Salvar transação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
