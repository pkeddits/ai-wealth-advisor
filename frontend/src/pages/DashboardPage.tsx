import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { aiService } from '../services';
import { requestQuoteRefresh } from '../services/quotes';
import { loadDemoSample } from '../services/demo';
import { isApiMode, isDemoMode, isSupabaseMode } from '../config/appMode';
import { OpenFinanceSummary } from '../components/openfinance/OpenFinanceSummary';
import { FinanceOverview } from './dashboard/FinanceOverview';
import { FloatingNote } from '../components/motion';
import { ViewSwitch } from '../components/common/ViewSwitch';
import { AnimatePresence, motion as m } from 'motion/react';
import { usePreferences } from '../store/preferencesStore';
import { Button } from '../components/common';
import { Horizon } from '../components/brand';
import { useDashboardData } from './dashboard/useDashboardData';
import { PatrimonyPanel } from './dashboard/PatrimonyPanel';
import { ActivityPanel, AllocationPanel, HoldingsPanel, InsightsPanel, PortfoliosPanel, StatsStrip } from './dashboard/Panels';

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-12" aria-label="Carregando painel">
      <div className="skeleton h-[460px] !rounded-panel xl:col-span-8" />
      <div className="space-y-4 xl:col-span-4">
        <div className="skeleton h-28 !rounded-panel" />
        <div className="skeleton h-[316px] !rounded-panel" />
      </div>
    </div>
  );
}

function EmptyState({ onLoadSample, loadingSample }: { onLoadSample: () => void; loadingSample: boolean }) {
  return (
    <motion.section
      className="panel-feature relative isolate overflow-hidden px-6 pb-36 pt-16 text-center sm:px-12"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Horizon className="absolute inset-x-0 top-[55%] -z-10 h-[620px]" intensity="soft" />
      <h2 className="text-display mx-auto max-w-xl text-3xl sm:text-4xl">{isDemoMode ? 'Nenhuma carteira criada' : 'Boas-vindas ao seu painel'}</h2>
      <p className="mx-auto mt-4 max-w-md text-dark-600">
        {isDemoMode
          ? 'Crie sua primeira carteira e registre suas compras para acompanhar o patrimônio.'
          : 'Comece criando uma carteira. Depois, registre suas compras e vendas: posições, preço médio e capital aplicado são calculados a partir delas.'}
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/portfolios?nova=1">
          <Button size="lg" icon={<Plus className="h-4 w-4" />}>{isDemoMode ? 'Criar carteira' : 'Criar primeira carteira'}</Button>
        </Link>
        {isDemoMode && (
          <Button size="lg" variant="secondary" onClick={onLoadSample} loading={loadingSample}>
            Carregar carteira de exemplo
          </Button>
        )}
      </div>
    </motion.section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { portfolios, isLoading, error, totals, holdings, timeline, recent, transactionCount, loadingActivity, refresh } = useDashboardData();
  const [insights, setInsights] = useState<string[] | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const view = usePreferences((s) => s.dashboardView);
  const setPref = usePreferences((s) => s.set);

  const firstPortfolioId = portfolios[0]?.id;
  useEffect(() => {
    if (!isApiMode || !firstPortfolioId) return;
    aiService
      .getPortfolioInsights(firstPortfolioId)
      .then((data: { insights?: string[] }) => setInsights(data?.insights ?? null))
      .catch(() => setInsights(null));
  }, [firstPortfolioId]);

  const handleRefresh = async () => {
    requestQuoteRefresh();
    await refresh();
    setUpdatedAt(new Date());
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      const id = await loadDemoSample();
      await refresh();
      navigate(`/portfolios/${id}`);
    } finally {
      setLoadingSample(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'investidor';
  const hasPortfolios = portfolios.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-dark-500">{greeting()}, {firstName}</p>
          <h1 className="text-display mt-1 text-[2rem] leading-tight sm:text-[2.4rem]">Visão geral</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-dark-500">
            <span className="rounded-full border border-dark-200/70 px-2.5 py-1">
              {portfolios.length} {portfolios.length === 1 ? 'carteira' : 'carteiras'}
            </span>
            <span className="rounded-full border border-dark-200/70 px-2.5 py-1">
              Atualizado às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRefresh} icon={<RefreshCw className="h-4 w-4" />}>Atualizar</Button>
          <Link to="/portfolios?nova=1">
            <Button icon={<Plus className="h-4 w-4" />}>Nova carteira</Button>
          </Link>
        </div>
      </div>

      <ViewSwitch id="dashboard" label="Visão do dashboard" value={view} onChange={(v) => setPref('dashboardView', v)} options={[{ value: 'investimentos', label: 'Investimentos' }, { value: 'financas', label: 'Finanças' }]} />

      <AnimatePresence mode="wait" initial={false}>
      {view === 'financas' ? (
        <m.div key="financas" initial={{ opacity: 0, x: 36, scale: 0.985 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -28, scale: 0.985 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
          <FinanceOverview />
        </m.div>
      ) : (
      <m.div key="investimentos" className="space-y-6" initial={{ opacity: 0, x: -36, scale: 0.985 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 28, scale: 0.985 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700" role="alert">
          Não foi possível carregar as carteiras: {error}
        </div>
      )}

      {isLoading && !hasPortfolios ? (
        <DashboardSkeleton />
      ) : !hasPortfolios ? (
        <>
          <EmptyState onLoadSample={handleLoadSample} loadingSample={loadingSample} />
          {isSupabaseMode && <OpenFinanceSummary />}
        </>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="relative xl:col-span-8">
              <FloatingNote className="-top-3 right-8" tone={totals.marketAvailable ? 'ok' : 'brand'} delay={1}>
                {totals.marketAvailable ? `Valor de mercado atualizado às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando cotações para o valor de mercado'}
              </FloatingNote>
              <PatrimonyPanel {...totals} timeline={timeline} onRefresh={handleRefresh} />
            </div>
            <div className="flex flex-col gap-4 xl:col-span-4">
              <StatsStrip portfolios={portfolios.length} assets={holdings.length} operations={transactionCount} />
              <AllocationPanel holdings={holdings} marketAvailable={totals.marketAvailable} />
            </div>
          </div>

          {isSupabaseMode && <OpenFinanceSummary />}

          <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-12">
            <PortfoliosPanel portfolios={portfolios} />
            <HoldingsPanel holdings={holdings} />
            <div className="lg:col-span-2 xl:col-span-3">
              <InsightsPanel insights={insights} />
            </div>
          </div>

          <ActivityPanel transactions={recent} loading={loadingActivity} />
        </>
      )}
      </m.div>
      )}
      </AnimatePresence>

      {!hasPortfolios && !isLoading && isDemoMode && (
        <p className="flex items-center justify-center gap-2 text-xs text-dark-500">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> A carteira de exemplo usa dados fictícios.
        </p>
      )}
    </div>
  );
}
