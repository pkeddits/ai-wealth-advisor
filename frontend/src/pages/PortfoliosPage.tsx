import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, Wallet } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { Card, CardBody, Button, Input, Badge, LoadingSpinner, Modal } from '../components/common';
import { riskProfileLabel } from '../utils/labels';
import clsx from 'clsx';

type RiskProfile = 'conservador' | 'moderado' | 'arrojado';
const emptyForm = { name: '', description: '', riskProfile: 'moderado' as RiskProfile };

export function PortfoliosPage() {
  const { portfolios, fetchPortfolios, createPortfolio, isLoading, error } = usePortfolioStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  // /portfolios?nova=1 abre o formulário de criação (usado pelos atalhos do dashboard)
  useEffect(() => {
    if (searchParams.get('nova') === '1') {
      setIsModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      await createPortfolio(formData);
      setIsModalOpen(false);
      setFormData(emptyForm);
    } catch (error: any) {
      setFormErrors({ submit: error.message });
    }
  };

  const filteredPortfolios = portfolios.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Minhas Carteiras</h1>
          <p className="text-dark-600 mt-1">Gerencie seus portfólios de investimento</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Nova Carteira
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
          Não foi possível carregar as carteiras: {error}
        </div>
      )}

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredPortfolios.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-dark-400" />
              </div>
              <h2 className="text-xl font-semibold text-dark-900 mb-2">
                {searchQuery ? 'Nenhuma carteira encontrada' : 'Nenhuma carteira criada'}
              </h2>
              <p className="text-dark-600 mb-6">
                {searchQuery ? 'Tente alterar sua busca' : 'Crie sua primeira carteira para começar'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                  Criar Carteira
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-dark-200">
              <div className="p-4 bg-dark-50">
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Buscar carteiras..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                    icon={<Search className="w-4 h-4" />}
                  />
                </div>
              </div>
              <div className="divide-y divide-dark-200">
                {filteredPortfolios.map((portfolio) => (
                  <Link key={portfolio.id} to={`/portfolios/${portfolio.id}`} className="block">
                    <div className="p-4 hover:bg-dark-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-dark-900">{portfolio.name}</p>
                          <p className="text-sm text-dark-500">{portfolio.description || 'Sem descrição'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="blue">{riskProfileLabel(portfolio.riskProfile)}</Badge>
                        <div className="text-right hidden sm:block">
                          <p className="font-semibold text-dark-900">
                            R$ {(portfolio.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className={clsx('text-sm', (portfolio.totalReturnPct || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {(portfolio.totalReturnPct || 0) >= 0 ? '+' : ''}{(portfolio.totalReturnPct || 0).toFixed(2)}%
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-dark-400" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create Portfolio Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Carteira" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome da carteira"
            placeholder="Ex: Minha Carteira de Ações"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            error={formErrors.name}
          />
          <Input
            label="Descrição (opcional)"
            placeholder="Descreva o objetivo desta carteira"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Perfil de risco</label>
            <select
              value={formData.riskProfile}
              onChange={(e) => setFormData({...formData, riskProfile: e.target.value as RiskProfile})}
              className="w-full px-3 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="arrojado">Arrojado</option>
            </select>
          </div>
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
              Criar Carteira
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
