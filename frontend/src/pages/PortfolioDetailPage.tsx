import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, RotateCcw, Download, Upload, Eye, Edit, Trash2 } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { portfolioService, transactionService, assetService } from '../services';
import { Card, CardBody, Button, Input, Select, Modal, Badge, LoadingSpinner, Table } from '../components/common';
import { formatCurrency, formatPercent } from '../utils/format';
import clsx from 'clsx';

interface Position {
  id: string;
  asset: { symbol: string; name: string; class: string };
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
  const { currentPortfolio, positions, transactions, selectPortfolio, fetchPositions, fetchTransactions, addTransaction, refreshCurrentPortfolio } = usePortfolioStore();
  const [activeTab, setActiveTab] = useState<'positions' | 'transactions' | 'performance'>('positions');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    assetId: '',
    type: 'compra',
    quantity: '',
    price: '',
    fees: '0',
    date: new Date().toISOString().split('T')[0],
  });
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  useEffect(() => {
    if (id) {
      selectPortfolio({ id } as any);
    }
  }, [id, selectPortfolio]);

  useEffect(() => {
    if (currentPortfolio) {
      fetchPositions(currentPortfolio.id);
      fetchTransactions(currentPortfolio.id);
      loadAssets();
    }
  }, [currentPortfolio]);

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
    try {
      await addTransaction({
        ...formData,
        portfolioId: currentPortfolio?.id,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        fees: parseFloat(formData.fees),
      });
      setIsTransactionModalOpen(false);
      setFormData({ assetId: '', type: 'compra', quantity: '', price: '', fees: '0', date: new Date().toISOString().split('T')[0] });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalGain = positions.reduce((sum, p) => sum + p.unrealizedGain, 0);
  const totalGainPct = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/portfolios" className="text-sm text-dark-500 hover:underline mb-2 inline-block">
            ← Voltar às carteiras
          </Link>
          <h1 className="text-2xl font-bold text-dark-900">{currentPortfolio?.name}</h1>
          <p className="text-dark-600 mt-1">{currentPortfolio?.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEditMode(!isEditMode)} icon={<RotateCcw className="w-4 h-4" />}>
            {isEditMode ? 'Salvar' : 'Editar'}
          </Button>
          <Button onClick={() => setIsTransactionModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
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
              {currentPortfolio?.riskProfile}
            </Badge>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {[
            { id: 'positions', label: 'Posições', icon: <DollarSign className="w-4 h-4" /> },
            { id: 'transactions', label: 'Transações', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'performance', label: 'Performance', icon: <PieChart className="w-4 h-4" /> },
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
              <tab.icon />
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
                <Button onClick={() => setIsTransactionModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Adicionar Ativo
                </Button>
              </div>
            ) : (
              <Table
                columns={[
                  { key: 'asset.symbol', header: 'Ativo', render: (row: Position) => (
                    <div>
                      <p className="font-medium text-dark-900">{row.asset.symbol}</p>
                      <p className="text-sm text-dark-500">{row.asset.name}</p>
                    </div>
                  )},
                  { key: 'asset.class', header: 'Classe', render: (row: Position) => (
                    <Badge variant="gray">{row.asset.class}</Badge>
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
                    <Badge variant={row.type === 'compra' ? 'green' : 'red'}>{row.type}</Badge>
                  )},
                  { key: 'quantity', header: 'Quantidade', render: (row: any) => row.quantity.toLocaleString('pt-BR') },
                  { key: 'price', header: 'Preço', render: (row: any) => formatCurrency(row.price) },
                  { key: 'fees', header: 'Taxas', render: (row: any) => formatCurrency(row.fees) },
                  { key: 'total', header: 'Total', render: (row: any) => formatCurrency(row.quantity * row.price + row.fees) },
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
                <h3 className="text-lg font-semibold text-dark-900 mb-4">Evolução do Patrimônio</h3>
                <div className="h-64 bg-dark-50 rounded-lg flex items-center justify-center">
                  <span className="text-dark-400">Gráfico de performance (Recharts)</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-4">Alocação por Classe</h3>
                <div className="h-64 bg-dark-50 rounded-lg flex items-center justify-center">
                  <span className="text-dark-400">Gráfico de pizza (Recharts)</span>
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
            onChange={(e) => setFormData({...formData, assetId: e.target.value})}
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
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTransactionModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Adicionar Transação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
