import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortfolioStore } from '../store/portfolioStore';
import { portfolioService, assetService } from '../services';
import { Card, CardBody, Button, Input, Select, Modal, Badge, LoadingSpinner, Table } from '../components/common';
import { formatCurrency } from '../utils/format';
import { assetClassLabel, riskProfileLabel, transactionTypeLabel } from '../utils/labels';
import { isDemoMode } from '../config/appMode';
import { demoPriceOf } from '../services/demo';
import { AllocationDonut, SERIES_COLORS } from '../components/charts';
import { MoneyFigure } from '../components/motion';
import clsx from 'clsx';

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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/portfolios" className="group inline-flex items-center gap-1.5 text-sm text-dark-500 transition-colors hover:text-dark-800">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Voltar às carteiras
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-display text-[2rem] leading-tight sm:text-[2.4rem]">{portfolio.name}</h1>
            <span className="chip-building">{riskProfileLabel(portfolio.riskProfile)}</span>
          </div>
          {portfolio.description && <p className="mt-1 text-dark-600">{portfolio.description}</p>}
        </div>
        <Button onClick={openTransactionModal} icon={<Plus className="h-4 w-4" />}>
          Nova Transação
        </Button>
      </div>

      <motion.section
        className="panel-feature overflow-hidden p-6 sm:p-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Resumo da carteira"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-500/20 blur-[90px]" aria-hidden="true" />
        <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-sm text-dark-500">Valor Total</p>
            <MoneyFigure value={totalValue} className="mt-2 block whitespace-nowrap text-[2.2rem] font-semibold leading-none tracking-[-0.03em] text-dark-900 sm:text-[3rem]" />
            <p className={clsx('mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium', totalGain >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}>
              {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
              <span className="opacity-80">({totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%)</span>
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-sm md:text-right">
            <div><dt className="text-dark-500">Aplicado</dt><dd className="mt-1 whitespace-nowrap font-medium text-dark-900">{formatCurrency(totalValue - totalGain)}</dd></div>
            <div><dt className="text-dark-500">Posições</dt><dd className="mt-1 font-medium text-dark-900">{positions.length}</dd></div>
            <div><dt className="text-dark-500">Operações</dt><dd className="mt-1 font-medium text-dark-900">{transactions.length}</dd></div>
          </dl>
        </div>
      </motion.section>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-dark-200/70 bg-dark-100/40 p-1 sm:inline-flex" role="tablist" aria-label="Seções da carteira">
        {[
          { id: 'positions', label: 'Posições', icon: DollarSign },
          { id: 'transactions', label: 'Transações', icon: TrendingUp },
          { id: 'performance', label: 'Alocação', icon: PieChart },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id ? 'text-dark-900' : 'text-dark-500 hover:text-dark-800',
            )}
          >
            {activeTab === tab.id && (
              <motion.span layoutId="portfolio-tab" className="absolute inset-0 rounded-xl border border-primary-500/30 bg-primary-500/15" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
            )}
            <tab.icon className="relative h-4 w-4" aria-hidden="true" />
            <span className="relative">{tab.label}</span>
          </button>
        ))}
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
                  <AllocationDonut
                    slices={allocationByClass.map((a, i) => ({ key: a.name, label: a.name, value: a.value, color: SERIES_COLORS[i % SERIES_COLORS.length] }))}
                    formatValue={formatCurrency}
                    size={200}
                  />
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
