import { useState, useEffect } from 'react';
import { Plus, Play, Trash2, BarChart3 } from 'lucide-react';
import { simulationService } from '../services/simulation';
import { usePortfolioStore } from '../store/portfolioStore';
import { Card, CardBody, Button, Input, Select, Modal, Badge, LoadingSpinner, Table } from '../components/common';
import { formatPercent } from '../utils/format';

interface Simulation {
  id: string;
  name: string;
  type: 'monte_carlo' | 'historical' | 'stress_test';
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: any;
  results?: {
    expectedReturn: number;
    worstCase: number;
    bestCase: number;
    percentile5: number;
    percentile95: number;
    probabilityOfLoss: number;
    paths?: number[][];
  };
  createdAt: string;
}

export function SimulationsPage() {
  const { currentPortfolio } = usePortfolioStore();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'monte_carlo',
    timeHorizon: 252,
    numSimulations: 1000,
    confidenceLevel: 0.95,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadSimulations = async () => {
    if (!currentPortfolio) return;
    setIsLoading(true);
    try {
      const data = await simulationService.list(currentPortfolio.id);
      setSimulations(data);
    } catch (error) {
      console.error('Failed to load simulations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSimulations();
  }, [currentPortfolio]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      await simulationService.create(currentPortfolio!.id, formData);
      setIsModalOpen(false);
      setFormData({ name: '', type: 'monte_carlo', timeHorizon: 252, numSimulations: 1000, confidenceLevel: 0.95 });
      loadSimulations();
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    }
  };

  const handleRun = async (sim: Simulation) => {
    try {
      await simulationService.run(sim.id);
      loadSimulations();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta simulação?')) {
      try {
        await simulationService.delete(id);
        loadSimulations();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handleViewResults = (sim: Simulation) => {
    setActiveSimulation(sim);
  };

  if (!currentPortfolio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Simulações
          </h1>
          <p className="text-dark-600 mt-1">Monte Carlo, backtesting histórico e stress testing</p>
        </div>
        <Card>
          <CardBody className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-900 mb-2">Selecione uma carteira</h2>
            <p className="text-dark-600">Escolha uma carteira para criar e rodar simulações</p>
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
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Simulações
          </h1>
          <p className="text-dark-600 mt-1">Monte Carlo, backtesting histórico e stress testing para {currentPortfolio.name}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Nova Simulação
        </Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : simulations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-dark-400" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 mb-2">Nenhuma simulação criada</h2>
              <p className="text-dark-600 mb-6">Crie sua primeira simulação para projetar cenários futuros</p>
              <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                Criar Simulação
              </Button>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'name', header: 'Nome', render: (row: Simulation) => (
                  <div>
                    <p className="font-medium text-dark-900">{row.name}</p>
                    <p className="text-sm text-dark-500">{row.type.replace('_', ' ')}</p>
                  </div>
                )},
                { key: 'status', header: 'Status', render: (row: Simulation) => (
                  <Badge variant={
                    row.status === 'completed' ? 'green' :
                    row.status === 'running' ? 'blue' :
                    row.status === 'failed' ? 'red' : 'gray'
                  }>{row.status}</Badge>
                )},
                { key: 'parameters.timeHorizon', header: 'Horizonte (dias)', render: (row: Simulation) => row.parameters?.timeHorizon },
                { key: 'parameters.numSimulations', header: 'Simulações', render: (row: Simulation) => row.parameters?.numSimulations?.toLocaleString('pt-BR') },
                { key: 'results.expectedReturn', header: 'Retorno Esperado', render: (row: Simulation) => 
                  row.results ? formatPercent(row.results.expectedReturn) : '-' },
                { key: 'results.probabilityOfLoss', header: 'Prob. Perda', render: (row: Simulation) => 
                  row.results ? `${(row.results.probabilityOfLoss * 100).toFixed(1)}%` : '-' },
                { key: 'createdAt', header: 'Criado em', render: (row: Simulation) => 
                  new Date(row.createdAt).toLocaleDateString('pt-BR') },
                { key: 'actions', header: 'Ações', render: (row: Simulation) => (
                  <div className="flex items-center gap-2">
                    {row.status !== 'running' && row.status !== 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleViewResults(row)} icon={<BarChart3 className="w-4 h-4" />}>
                        Ver
                      </Button>
                    )}
                    {row.status === 'completed' || row.status === 'failed' ? (
                                          <Button variant="ghost" size="sm" onClick={() => handleRun(row)} icon={<Play className="w-4 h-4" />}>
                                            Rodar
                                          </Button>
                                        ) : null}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} icon={<Trash2 className="w-4 h-4" />} className="text-red-600 hover:text-red-700">
                    </Button>
                  </div>
                )},
              ]}
              data={simulations}
              keyExtractor={(row: Simulation) => row.id}
              isLoading={isLoading}
            />
          )}
        </CardBody>
      </Card>

      {/* Create Simulation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Simulação" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome da simulação"
            placeholder="Ex: Monte Carlo 1 Ano"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            error={formErrors.name}
          />
          <Select
            label="Tipo de simulação"
            options={[
              { value: 'monte_carlo', label: 'Monte Carlo' },
              { value: 'historical', label: 'Backtesting Histórico' },
              { value: 'stress_test', label: 'Stress Testing' },
            ]}
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horizonte (dias úteis)"
              type="number"
              placeholder="252"
              value={formData.timeHorizon}
              onChange={(e) => setFormData({...formData, timeHorizon: parseInt(e.target.value) || 252})}
            />
            <Input
              label="Nº de simulações"
              type="number"
              placeholder="1000"
              value={formData.numSimulations}
              onChange={(e) => setFormData({...formData, numSimulations: parseInt(e.target.value) || 1000})}
            />
          </div>
          <Input
            label="Nível de confiança"
            type="number"
            step="0.01"
            min="0.9"
            max="0.99"
            placeholder="0.95"
            value={formData.confidenceLevel}
            onChange={(e) => setFormData({...formData, confidenceLevel: parseFloat(e.target.value) || 0.95})}
          />
          {formErrors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formErrors.submit}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Simulação
            </Button>
          </div>
        </form>
      </Modal>

      {/* Results Modal */}
      {activeSimulation && activeSimulation.results && (
        <Modal isOpen={!!activeSimulation} onClose={() => setActiveSimulation(null)} title={`Resultados: ${activeSimulation.name}`} size="xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardBody className="p-4 text-center">
                <p className="text-sm text-dark-500">Retorno Esperado</p>
                <p className="text-2xl font-bold text-dark-900">{formatPercent(activeSimulation.results.expectedReturn)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <p className="text-sm text-dark-500">Pior Cenário (5%)</p>
                <p className="text-2xl font-bold text-red-600">{formatPercent(activeSimulation.results.percentile5)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <p className="text-sm text-dark-500">Melhor Cenário (95%)</p>
                <p className="text-2xl font-bold text-green-600">{formatPercent(activeSimulation.results.percentile95)}</p>
              </CardBody>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody className="p-4">
                <h3 className="text-lg font-semibold text-dark-900 mb-4">Distribuição de Retornos</h3>
                <div className="h-64 bg-dark-50 rounded-lg flex items-center justify-center">
                  <span className="text-dark-400">Histograma (Recharts)</span>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <h3 className="text-lg font-semibold text-dark-900 mb-4">Caminhos de Monte Carlo</h3>
                <div className="h-64 bg-dark-50 rounded-lg flex items-center justify-center">
                  <span className="text-dark-400">Gráfico de caminhos (Recharts)</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </Modal>
      )}
    </div>
  );
}
