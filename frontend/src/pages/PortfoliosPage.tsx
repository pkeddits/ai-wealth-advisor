import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, Wallet } from 'lucide-react';
import { usePortfolioStore } from '../store/portfolioStore';
import { motion } from 'motion/react';
import { Button, Input, Badge, Modal } from '../components/common';
import { SERIES_COLORS } from '../components/charts';
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display text-[2rem] leading-tight sm:text-[2.4rem]">Minhas Carteiras</h1>
          <p className="mt-1 text-dark-600">Gerencie seus portfólios de investimento</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Nova Carteira
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700" role="alert">
          Não foi possível carregar as carteiras: {error}
        </div>
      )}

      {portfolios.length > 0 && (
        <Input
          placeholder="Buscar carteiras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
          icon={<Search className="h-4 w-4" />}
          aria-label="Buscar carteiras"
        />
      )}

      {isLoading && portfolios.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-52 !rounded-panel" />)}
        </div>
      ) : filteredPortfolios.length === 0 ? (
        <div className="panel-feature px-6 py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700">
            <Wallet className="h-7 w-7" />
          </div>
          <h2 className="text-display text-2xl">{searchQuery ? 'Nenhuma carteira encontrada' : 'Nenhuma carteira criada'}</h2>
          <p className="mx-auto mt-2 max-w-sm text-dark-600">{searchQuery ? 'Tente alterar sua busca' : 'Crie sua primeira carteira para começar'}</p>
          {!searchQuery && (
            <Button className="mt-7" onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Criar Carteira
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPortfolios.map((portfolio, index) => {
            const pct = portfolio.totalReturnPct || 0;
            const positions = portfolio.positions ?? [];
            const total = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
            return (
              <motion.div
                key={portfolio.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to={`/portfolios/${portfolio.id}`}
                  className="panel group flex h-full flex-col p-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-[0_30px_60px_-30px_rgb(var(--violet)/0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-200 bg-dark-100 text-primary-700 transition-colors group-hover:border-primary-500/40">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <Badge variant="blue">{riskProfileLabel(portfolio.riskProfile)}</Badge>
                  </div>
                  <p className="mt-5 font-display text-lg font-semibold tracking-tight text-dark-900">{portfolio.name}</p>
                  <p className="mt-0.5 truncate text-sm text-dark-500">{portfolio.description || 'Sem descrição'}</p>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    <p className="whitespace-nowrap text-2xl font-semibold tracking-tight text-dark-900">
                      R$ {(portfolio.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={clsx('rounded-full px-2 py-0.5 text-sm font-medium', pct >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-dark-100" aria-hidden="true">
                    {total > 0 &&
                      positions.map((p, i) => (
                        <span key={p.assetId} className="h-full" style={{ width: `${((p.currentValue || 0) / total) * 100}%`, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                      ))}
                  </div>
                  <p className="mt-3 flex items-center justify-between text-xs text-dark-500">
                    {positions.length} {positions.length === 1 ? 'posição' : 'posições'}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

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
