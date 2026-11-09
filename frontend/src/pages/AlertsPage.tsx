import { useState, useEffect } from 'react';
import { Plus, Bell, BellOff, Edit, Trash2, Play, Loader2, Filter, X } from 'lucide-react';
import { alertService } from '../services';
import { usePortfolioStore } from '../store/portfolioStore';
import { Card, CardBody, Button, Input, Select, Modal, Badge, LoadingSpinner, Table } from '../components/common';
import clsx from 'clsx';

interface Alert {
  id: string;
  name: string;
  type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike' | 'rsi_overbought' | 'rsi_oversold' | 'macd_cross' | 'portfolio_value' | 'drawdown' | 'concentration' | 'news_sentiment';
  assetId?: string;
  asset?: { symbol: string; name: string };
  condition: 'above' | 'below' | 'crosses_up' | 'crosses_down';
  threshold: number;
  enabled: boolean;
  triggeredAt?: string;
  createdAt: string;
}

const alertTypes = [
  { value: 'price_above', label: 'Preço Acima de' },
  { value: 'price_below', label: 'Preço Abaixo de' },
  { value: 'percent_change', label: 'Variação Percentual' },
  { value: 'volume_spike', label: 'Pico de Volume' },
  { value: 'rsi_overbought', label: 'RSI Sobrecomprado' },
  { value: 'rsi_oversold', label: 'RSI Sobrevendido' },
  { value: 'macd_cross', label: 'Cruzamento MACD' },
  { value: 'portfolio_value', label: 'Valor da Carteira' },
  { value: 'drawdown', label: 'Drawdown' },
  { value: 'concentration', label: 'Concentração' },
  { value: 'news_sentiment', label: 'Sentimento de Notícias' },
];

const alertConditions = {
  price_above: [{ value: 'above', label: 'Acima de' }],
  price_below: [{ value: 'below', label: 'Abaixo de' }],
  percent_change: [{ value: 'above', label: 'Acima de' }, { value: 'below', label: 'Abaixo de' }],
  volume_spike: [{ value: 'above', label: 'Acima de' }],
  rsi_overbought: [{ value: 'above', label: 'Acima de' }],
  rsi_oversold: [{ value: 'below', label: 'Abaixo de' }],
  macd_cross: [{ value: 'crosses_up', label: 'Cruza para Cima' }, { value: 'crosses_down', label: 'Cruza para Baixo' }],
  portfolio_value: [{ value: 'above', label: 'Acima de' }, { value: 'below', label: 'Abaixo de' }],
  drawdown: [{ value: 'above', label: 'Acima de' }],
  concentration: [{ value: 'above', label: 'Acima de' }],
  news_sentiment: [{ value: 'below', label: 'Abaixo de' }, { value: 'above', label: 'Acima de' }],
};

export function AlertsPage() {
  const { currentPortfolio } = usePortfolioStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'price_above',
    assetId: '',
    condition: 'above',
    threshold: '',
    enabled: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('');

  const loadAlerts = async () => {
    if (!currentPortfolio) return;
    setIsLoading(true);
    try {
      const data = await alertService.list(currentPortfolio.id);
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      // Would normally call assetService.list()
      setAssets([
        { id: '1', symbol: 'PETR4', name: 'Petrobras PN' },
        { id: '2', symbol: 'VALE3', name: 'Vale ON' },
        { id: '3', symbol: 'ITUB4', name: 'Itaú Unibanco PN' },
      ]);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadAssets();
  }, [currentPortfolio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    if (!formData.assetId) errors.assetId = 'Selecione um ativo';
    if (!formData.threshold) errors.threshold = 'Limite é obrigatório';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      if (editingAlert) {
        await alertService.update(editingAlert.id, formData);
      } else {
        await alertService.create(currentPortfolio!.id, formData);
      }
      setIsModalOpen(false);
      setEditingAlert(null);
      resetForm();
      loadAlerts();
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    }
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setFormData({
      name: alert.name,
      type: alert.type,
      assetId: alert.assetId || '',
      condition: alert.condition,
      threshold: alert.threshold.toString(),
      enabled: alert.enabled,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este alerta?')) {
      try {
        await alertService.delete(id);
        loadAlerts();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleTest = async (id: string) => {
    try {
      await alertService.test(id);
      alert('Alerta testado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggle = async (alert: Alert) => {
    try {
      await alertService.update(alert.id, { enabled: !alert.enabled });
      loadAlerts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'price_above',
      assetId: '',
      condition: 'above',
      threshold: '',
      enabled: true,
    });
  };

  const openCreateModal = () => {
    setEditingAlert(null);
    resetForm();
    setIsModalOpen(true);
  };

  const filteredAlerts = alerts.filter(a => 
    !filterType || a.type === filterType
  );

  if (!currentPortfolio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" />
            Alertas
          </h1>
          <p className="text-dark-600 mt-1">Monitore seus investimentos com alertas inteligentes</p>
        </div>
        <Card>
          <CardBody className="p-12 text-center">
            <Bell className="w-16 h-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-900 mb-2">Selecione uma carteira</h2>
            <p className="text-dark-600">Escolha uma carteira para configurar alertas personalizados</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" />
            Alertas
          </h1>
          <p className="text-dark-600 mt-1">Configure alertas para {currentPortfolio.name}</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[{ value: '', label: 'Todos os tipos' }, ...alertTypes]}
            className="w-48"
          />
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            Novo Alerta
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-dark-400" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 mb-2">Nenhum alerta configurado</h2>
              <p className="text-dark-600 mb-6">Crie alertas para ser notificado sobre movimentos importantes</p>
              <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
                Criar Alerta
              </Button>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'name', header: 'Nome', render: (row: Alert) => (
                  <div className="flex items-center gap-2">
                    <span className={clsx('w-2 h-2 rounded-full', row.enabled ? 'bg-green-500' : 'bg-dark-300')} />
                    <p className="font-medium text-dark-900">{row.name}</p>
                  </div>
                )},
                { key: 'type', header: 'Tipo', render: (row: Alert) => (
                  <Badge variant="gray">{alertTypes.find(t => t.value === row.type)?.label || row.type}</Badge>
                )},
                { key: 'asset.symbol', header: 'Ativo', render: (row: Alert) => row.asset?.symbol || 'Carteira' },
                { key: 'condition', header: 'Condição', render: (row: Alert) => (
                  <span className="text-sm text-dark-600 capitalize">{row.condition.replace('_', ' ')}</span>
                )},
                { key: 'threshold', header: 'Limite', render: (row: Alert) => (
                  <span className="font-medium text-dark-900">{row.threshold.toLocaleString('pt-BR')}</span>
                )},
                { key: 'enabled', header: 'Status', render: (row: Alert) => (
                  <button
                    onClick={() => handleToggle(row)}
                    className={clsx(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                      row.enabled ? 'bg-primary-600' : 'bg-dark-200'
                    )}
                    role="switch"
                    aria-checked={row.enabled}
                  >
                    <span className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
                      row.enabled ? 'translate-x-5' : 'translate-x-0'
                    )} />
                  </button>
                )},
                { key: 'triggeredAt', header: 'Último Disparo', render: (row: Alert) => 
                  row.triggeredAt ? new Date(row.triggeredAt).toLocaleDateString('pt-BR') : '-' },
                { key: 'actions', header: 'Ações', render: (row: Alert) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)} icon={<Edit className="w-4 h-4" />} />
                    <Button variant="ghost" size="sm" onClick={() => handleTest(row)} icon={<Play className="w-4 h-4" />} loading={row.enabled && false} />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} icon={<Trash2 className="w-4 h-4" />} className="text-red-600 hover:text-red-700" />
                  </div>
                )},
              ]}
              data={filteredAlerts}
              keyExtractor={(row: Alert) => row.id}
              isLoading={isLoading}
            />
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAlert(null); resetForm(); }} title={editingAlert ? 'Editar Alerta' : 'Novo Alerta'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do alerta"
            placeholder="Ex: PETR4 acima de R$ 30"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            error={formErrors.name}
          />
          <Select
            label="Tipo de alerta"
            options={alertTypes}
            value={formData.type}
            onChange={(e) => {
              const newType = e.target.value;
              setFormData({...formData, type: newType, condition: alertConditions[newType as keyof typeof alertConditions][0].value});
            }}
            error={formErrors.type}
          />
          <Select
            label="Ativo"
            placeholder="Selecione um ativo (opcional para alertas de carteira)"
            options={[
              { value: '', label: 'Carteira inteira' },
              ...assets.map(a => ({ value: a.id, label: `${a.symbol} - ${a.name}` }))
            ]}
            value={formData.assetId}
            onChange={(e) => setFormData({...formData, assetId: e.target.value})}
            error={formErrors.assetId}
          />
          <Select
            label="Condição"
            options={alertConditions[formData.type as keyof typeof alertConditions]}
            value={formData.condition}
            onChange={(e) => setFormData({...formData, condition: e.target.value})}
          />
          <Input
            label="Limite"
            type="number"
            step="0.01"
            placeholder="Ex: 30.00"
            value={formData.threshold}
            onChange={(e) => setFormData({...formData, threshold: e.target.value})}
            error={formErrors.threshold}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
              className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="enabled" className="text-sm text-dark-700">Ativo</label>
          </div>
          {formErrors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formErrors.submit}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingAlert(null); resetForm(); }} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {editingAlert ? 'Salvar' : 'Criar Alerta'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
