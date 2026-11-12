import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, TrendingUp, DollarSign, PieChart, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { usePortfolioStore } from '../store/portfolioStore';
import { portfolioService, assetService, transactionService } from '../services';
import { Card, CardBody, Button, Input, Select, Modal, Badge, LoadingSpinner, Table } from '../components/common';
import { formatCurrency } from '../utils/format';
import { assetClassLabel, riskProfileLabel, transactionTypeLabel } from '../utils/labels';
import { isDemoMode } from '../config/appMode';
import { demoPriceOf } from '../services/demo';
import { AllocationDonut, SERIES_COLORS } from '../components/charts';
import { MoneyFigure } from '../components/motion';
import clsx from 'clsx';
import type { Position, Transaction } from '../types';
import { useDisplayFormat } from '../lib/displayFormat';
import { computeRealized } from '../domain/positions';
import { errorMessage } from '../lib/errorMessage';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pending = <span className="text-xs text-dark-500">Cotação pendente</span>;

export function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fmt = useDisplayFormat();
  const { currentPortfolio, positions, transactions, selectPortfolio, addTransaction, fetchPortfolios } = usePortfolioStore();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', riskProfile: 'moderado' as 'conservador' | 'moderado' | 'arrojado' });
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
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

  const marketAvailable = positions.every((p) => p.currentValue !== null);
  const totalInvested = positions.reduce((sum, p) => sum + p.investedValue, 0);
  const totalValue = marketAvailable ? positions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0) : null;
  const totalGain = totalValue === null ? null : totalValue - totalInvested;
  const totalGainPct = totalGain === null || totalInvested <= 0 ? null : (totalGain / totalInvested) * 100;
  const pendingQuotes = positions.filter((p) => p.currentValue === null).length;
  const realizedGain = transactions.length
    ? computeRealized(transactions.map((t) => ({ assetId: t.assetId, type: t.type as 'compra' | 'venda', quantity: t.quantity, price: t.price, fees: t.fees, date: t.date.slice(0, 10), createdAt: t.createdAt })))
    : undefined;

  const refresh = async () => {
    if (id) await selectPortfolio(await portfolioService.get(id));
  };

  const openEdit = () => {
    if (!portfolio) return;
    setEditForm({ name: portfolio.name, description: portfolio.description ?? '', riskProfile: portfolio.riskProfile });
    setActionError('');
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setActionError('');
    try {
      await portfolioService.update(id, editForm);
      await refresh();
      setEditOpen(false);
    } catch (err) {
      setActionError(errorMessage(err, 'Não foi possível salvar a carteira.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!id) return;
    setBusy(true);
    setActionError('');
    try {
      await portfolioService.delete(id);
      await fetchPortfolios();
      navigate('/portfolios', { replace: true });
    } catch (err) {
      setActionError(errorMessage(err, 'Não foi possível excluir a carteira.'));
      setBusy(false);
    }
  };

  const removeTransaction = async (tx: Transaction) => {
    if (!window.confirm(`Excluir a ${tx.type === 'compra' ? 'compra' : 'venda'} de ${tx.asset?.symbol ?? 'ativo'} em ${fmt.date(tx.date)}?`)) return;
    try {
      await transactionService.delete(tx.id);
      await refresh();
    } catch (err) {
      window.alert(errorMessage(err, 'Não foi possível excluir a operação.'));
    }
  };

  const allocationByClass = Object.values(
    positions.reduce<Record<string, { name: string; value: number }>>((acc, p) => {
      const cls = p.asset?.class ?? 'outros';
      acc[cls] = acc[cls] ?? { name: assetClassLabel(cls), value: 0 };
      acc[cls].value += marketAvailable ? p.currentValue ?? 0 : p.investedValue;
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openEdit} icon={<Pencil className="h-4 w-4" />}>Editar</Button>
          <Button variant="ghost" onClick={() => { setActionError(''); setDeleteOpen(true); }} icon={<Trash2 className="h-4 w-4" />} aria-label="Excluir carteira">Excluir</Button>
          <Button onClick={openTransactionModal} icon={<Plus className="h-4 w-4" />}>
            Nova Transação
          </Button>
        </div>
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
            <p className="text-sm text-dark-500">{marketAvailable ? 'Valor Total' : 'Capital aplicado'}</p>
            <MoneyFigure value={totalValue ?? totalInvested} rounded={fmt.rounded} className="mt-2 block whitespace-nowrap text-[2.2rem] font-semibold leading-none tracking-[-0.03em] text-dark-900 sm:text-[3rem]" />
            {totalGain === null || totalGainPct === null ? (
              <p className="mt-4"><span className="chip-building">{isDemoMode ? 'Cotações ainda não integradas' : `Cotação pendente para ${pendingQuotes} ${pendingQuotes === 1 ? 'ativo' : 'ativos'}`}</span></p>
            ) : (
              <p className={clsx('mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium', totalGain >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}>
                {fmt.result(totalGain, totalGainPct)}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-4 text-sm md:text-right">
            <div><dt className="text-dark-500">Aplicado</dt><dd className="mt-1 whitespace-nowrap font-medium text-dark-900">{fmt.money(totalInvested)}</dd></div>
            <div><dt className="text-dark-500">Posições</dt><dd className="mt-1 font-medium text-dark-900">{positions.length}</dd></div>
            <div><dt className="text-dark-500">Operações</dt><dd className="mt-1 font-medium text-dark-900">{transactions.length}</dd></div>
            {realizedGain !== undefined && (
              <div className="col-span-3"><dt className="text-dark-500">Resultado realizado nas vendas</dt><dd className={clsx('mt-1 font-medium', realizedGain > 0 ? 'text-green-600' : realizedGain < 0 ? 'text-red-600' : 'text-dark-900')}>{fmt.signedMoney(realizedGain)}</dd></div>
            )}
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
                  { key: 'investedValue', header: 'Custo', render: (row: Position) => fmt.money(row.investedValue) },
                  { key: 'currentPrice', header: 'Preço Atual', render: (row: Position) => (row.currentPrice === null ? pending : (
                    <span>
                      {fmt.money(row.currentPrice)}
                      {row.quotedAt && <span className="block text-[11px] text-dark-500">{new Date(row.quotedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                    </span>
                  )) },
                  { key: 'currentValue', header: 'Valor Atual', render: (row: Position) => (row.currentValue === null ? pending : fmt.money(row.currentValue)) },
                  { key: 'unrealizedGain', header: 'Ganho/Perda', render: (row: Position) => row.unrealizedGain === null ? pending : (
                    <span className={clsx('font-medium', row.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {fmt.signedMoney(row.unrealizedGain)}
                    </span>
                  )},
                  { key: 'unrealizedGainPct', header: '%', render: (row: Position) => row.unrealizedGainPct === null ? pending : (
                    <span className={clsx('font-medium', row.unrealizedGainPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {fmt.percent(row.unrealizedGainPct)}
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
                  { key: 'date', header: 'Data', render: (row: any) => fmt.date(row.date) },
                  { key: 'asset.symbol', header: 'Ativo', render: (row: any) => row.asset?.symbol },
                  { key: 'type', header: 'Tipo', render: (row: any) => (
                    <Badge variant={row.type === 'compra' ? 'green' : 'red'}>{transactionTypeLabel(row.type)}</Badge>
                  )},
                  { key: 'quantity', header: 'Quantidade', render: (row: any) => row.quantity.toLocaleString('pt-BR') },
                  { key: 'price', header: 'Preço', render: (row: any) => formatCurrency(row.price) },
                  { key: 'fees', header: 'Taxas', render: (row: any) => formatCurrency(row.fees) },
                  { key: 'total', header: 'Total', render: (row: any) => fmt.money(row.total ?? row.quantity * row.price + row.fees) },
                  { key: 'actions', header: '', render: (row: any) => (
                    <button
                      type="button"
                      onClick={() => removeTransaction(row)}
                      className="rounded-lg p-1.5 text-dark-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                      aria-label={`Excluir operação de ${row.asset?.symbol ?? 'ativo'} em ${fmt.date(row.date)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) },
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
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar carteira">
        <form onSubmit={saveEdit} className="space-y-4">
          <Input id="edit-name" label="Nome" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required maxLength={100} />
          <Input id="edit-description" label="Descrição" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} maxLength={500} />
          <Select
            id="edit-risk"
            label="Perfil de risco"
            value={editForm.riskProfile}
            onChange={(e) => setEditForm({ ...editForm, riskProfile: e.target.value as typeof editForm.riskProfile })}
            options={[{ value: 'conservador', label: 'Conservador' }, { value: 'moderado', label: 'Moderado' }, { value: 'arrojado', label: 'Arrojado' }]}
          />
          {actionError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{actionError}</div>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={busy}>Salvar alterações</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir carteira" size="sm">
        <p className="text-dark-700">
          A carteira <strong className="text-dark-900">{portfolio.name}</strong> e suas {transactions.length} operações serão excluídas definitivamente.
        </p>
        {actionError && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{actionError}</div>}
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button type="button" variant="danger" className="flex-1" loading={busy} onClick={confirmDelete}>Excluir definitivamente</Button>
        </div>
      </Modal>
    </div>
  );
}
