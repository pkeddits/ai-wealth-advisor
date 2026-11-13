import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { FinanceCategory, FinanceEntry, FinanceEntryInput, FinanceKind } from '../types';
import { financeService, CATEGORIES, categoryMeta, loadDemoFinanceSample } from '../services/finance';
import { useCustomCategories } from '../services/planning';
import { GoalsTab } from './finance/GoalsTab';
import { BudgetsTab } from './finance/BudgetsTab';
import { CategoriesTab } from './finance/CategoriesTab';
import { summarizeMonth, shiftMonth } from '../domain/finance';
import { isDemoMode } from '../config/appMode';
import { useDisplayFormat } from '../lib/displayFormat';
import { errorMessage } from '../lib/errorMessage';
import { spotlightHandler } from '../hooks/useSpotlight';
import { AllocationDonut, DailyBars, SERIES_COLORS } from '../components/charts';
import { AnimatedNumber, MoneyFigure } from '../components/motion';
import { Button, Select } from '../components/common';
import { Segmented } from '../components/settings';
import { EntryModal } from './finance/EntryModal';
import { isSupabaseMode } from '../config/appMode';
import { Link } from 'react-router-dom';
import type { FinanceFlow } from '../types';

const FLOW_CHIPS: Partial<Record<FinanceFlow, string>> = { transfer: 'Transferência', investment: 'Investimento', card_payment: 'Fatura', refund: 'Estorno' };

const EASE = [0.22, 1, 0.36, 1] as const;

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (month: string) => {
  const label = new Date(`${month}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function defaultDateFor(month: string) {
  const today = new Date();
  const todayMonth = currentMonth();
  return month === todayMonth ? `${todayMonth}-${String(today.getDate()).padStart(2, '0')}` : `${month}-01`;
}

const TABS = [
  { id: 'mes', label: 'Visão do mês' },
  { id: 'metas', label: 'Metas' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'categorias', label: 'Categorias' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function FinancePage() {
  const fmt = useDisplayFormat();
  const [tab, setTabState] = useState<Tab>(() => (TABS.find((t) => `#${t.id}` === window.location.hash)?.id ?? 'mes'));
  const setTab = (t: Tab) => { setTabState(t); window.history.replaceState(null, '', t === 'mes' ? window.location.pathname : `#${t}`); };
  const loadCategories = useCustomCategories((st) => st.load);
  useCustomCategories((st) => st.list);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  const [month, setMonth] = useState(currentMonth);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [kindFilter, setKindFilter] = useState<'todos' | FinanceKind | 'revisar'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | FinanceCategory>('todas');
  const [loadingSample, setLoadingSample] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await financeService.list(month));
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível carregar as movimentações.'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => summarizeMonth(entries, month), [entries, month]);
  const visible = entries.filter((e) => (kindFilter === 'todos' || (kindFilter === 'revisar' ? e.needsReview : e.kind === kindFilter)) && (categoryFilter === 'todas' || e.category === categoryFilter));
  const hasImported = entries.some((e) => e.source !== 'manual');
  const grouped = useMemo(() => {
    const map = new Map<string, FinanceEntry[]>();
    for (const e of visible) map.set(e.occurredOn, [...(map.get(e.occurredOn) ?? []), e]);
    return [...map.entries()];
  }, [visible]);

  const save = async (input: FinanceEntryInput) => {
    if (editing) await financeService.update(editing.id, input);
    else await financeService.create(input);
    if (input.occurredOn.slice(0, 7) !== month) setMonth(input.occurredOn.slice(0, 7));
    else await load();
  };

  const reclassify = async (entry: FinanceEntry, change: { category: FinanceCategory; flow: FinanceFlow; note: string | null }) => {
    await financeService.reclassify(entry.id, change);
    await load();
  };

  const remove = async (entry: FinanceEntry) => {
    if (!window.confirm(`Excluir "${entry.description}" de ${fmt.date(entry.occurredOn)}?`)) return;
    try {
      await financeService.delete(entry.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível excluir a movimentação.'));
    }
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const loadSample = async () => {
    setLoadingSample(true);
    try {
      await loadDemoFinanceSample(month);
      await load();
    } finally {
      setLoadingSample(false);
    }
  };

  const slices = summary.expensesByCategory.map((c, i) => ({ key: c.category, label: categoryMeta(c.category).label, value: c.amount, color: SERIES_COLORS[i % SERIES_COLORS.length] }));
  const hasEntries = entries.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-dark-500">Finanças pessoais</p>
          <h1 className="text-display mt-1 text-[2rem] leading-tight sm:text-[2.4rem]">Receitas e despesas</h1>
          <div className={clsx('mt-3 flex flex-wrap items-center gap-2', (tab === 'metas' || tab === 'categorias') && 'hidden')}>
            <span className="text-xs text-dark-500">Período:</span>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-dark-200/70 bg-dark-100/50 p-1">
              <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-xl p-1.5 text-dark-600 hover:bg-dark-200/60 hover:text-dark-900" aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[150px] px-2 text-center text-sm font-medium text-dark-900" aria-live="polite">{monthLabel(month)}</span>
              <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-xl p-1.5 text-dark-600 hover:bg-dark-200/60 hover:text-dark-900" aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {month !== currentMonth() && (
              <button type="button" onClick={() => setMonth(currentMonth())} className="link-underline text-sm text-primary-700">Mês atual</button>
            )}
            {isDemoMode && <span className="chip-planned">Dados fictícios</span>}
          </div>
        </div>
        {tab === 'mes' && <Button onClick={openNew} icon={<Plus className="h-4 w-4" />}>Nova movimentação</Button>}
      </div>

      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-2xl border border-dark-200/70 bg-dark-100/40 p-1 max-sm:fade-x sm:inline-flex" role="tablist" aria-label="Seções de finanças pessoais">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={(e) => { setTab(t.id); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }); }} className={clsx('relative min-h-10 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors', tab === t.id ? 'text-dark-900' : 'text-dark-500 hover:text-dark-800')}>
            {tab === t.id && <motion.span layoutId="finance-tab" className="absolute inset-0 rounded-xl border border-primary-500/30 bg-primary-500/15" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'metas' && <GoalsTab />}
      {tab === 'orcamentos' && <BudgetsTab month={month} />}
      {tab === 'categorias' && <CategoriesTab />}
      {tab === 'mes' && (<>
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700" role="alert">{error}</div>}
      {isSupabaseMode && !loading && !hasImported && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-dark-200/70 bg-dark-50/40 px-4 py-3 text-sm text-dark-600">
          <Landmark className="h-4 w-4 text-primary-700" aria-hidden="true" />
          Importe movimentações automaticamente conectando um banco.
          <Link to="/integracoes" className="font-medium text-primary-700 hover:underline">Conectar banco</Link>
        </p>
      )}

      {loading && !hasEntries ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="skeleton h-48 !rounded-panel lg:col-span-6" />
          <div className="skeleton h-48 !rounded-panel lg:col-span-3" />
          <div className="skeleton h-48 !rounded-panel lg:col-span-3" />
        </div>
      ) : !hasEntries ? (
        <motion.section
          className="panel-feature relative isolate overflow-hidden px-6 py-16 text-center sm:px-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700">
            <ReceiptText className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="text-display mx-auto mt-6 max-w-xl text-3xl">Nenhuma movimentação em {monthLabel(month).toLowerCase()}</h2>
          <p className="mx-auto mt-3 max-w-md text-dark-600">
            Registre receitas e despesas para ver para onde vai o seu dinheiro. A importação automática das contas pelo Open Finance está planejada; o registro manual continuará disponível.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={openNew} icon={<Plus className="h-4 w-4" />}>Registrar primeira movimentação</Button>
            {isDemoMode && <Button size="lg" variant="secondary" onClick={loadSample} loading={loadingSample}>Carregar exemplos do mês</Button>}
          </div>
        </motion.section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-12">
            <motion.section
              className="panel-feature overflow-hidden p-6 sm:p-8 lg:col-span-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              aria-labelledby="saldo-titulo"
            >
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-500/20 blur-[90px]" aria-hidden="true" />
              <p id="saldo-titulo" className="relative text-sm text-dark-500">Saldo do período</p>
              <MoneyFigure
                value={summary.net}
                rounded={fmt.rounded}
                className={clsx('relative mt-2 block whitespace-nowrap text-[2.4rem] font-semibold leading-none tracking-[-0.03em] sm:text-[3.2rem]', summary.net < 0 ? 'text-red-600' : 'text-dark-900')}
              />
              <p className="relative mt-4 max-w-md text-sm text-dark-500">Receitas menos despesas do mês. Não é o saldo da sua conta bancária.</p>
              {(summary.pending > 0 || summary.review > 0 || summary.neutral > 0) && (
                <p className="relative mt-3 flex flex-wrap gap-2 text-xs">
                  {summary.review > 0 && <button type="button" onClick={() => setKindFilter('revisar')} className="chip border-yellow-500/30 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20">{summary.review} para revisar</button>}
                  {summary.pending > 0 && <span className="chip-planned">{summary.pending} pendentes</span>}
                  {summary.neutral > 0 && <span className="chip-planned">{summary.neutral} transferências, aplicações ou faturas fora dos totais</span>}
                </p>
              )}
            </motion.section>
            {[
              { label: 'Receitas', value: summary.income, icon: ArrowUpRight, tone: 'text-green-600 bg-green-500/10' },
              { label: 'Despesas', value: summary.expenses, icon: ArrowDownRight, tone: 'text-red-600 bg-red-500/10' },
            ].map(({ label, value, icon: Icon, tone }, i) => (
              <motion.section
                key={label}
                onPointerMove={spotlightHandler}
                className="panel spotlight flex flex-col justify-between p-6 lg:col-span-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 + i * 0.06, ease: EASE }}
              >
                <span className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <div className="mt-6">
                  <p className="text-sm text-dark-500">{label}</p>
                  <AnimatedNumber value={value} format={fmt.money} className="mt-1 block whitespace-nowrap text-2xl font-semibold tracking-tight text-dark-900" />
                </div>
              </motion.section>
            ))}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-12">
            <motion.section className="panel p-6 lg:col-span-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
              <h2 className="mb-4 text-[15px] font-semibold">Despesas por categoria</h2>
              {slices.length ? <AllocationDonut slices={slices} formatValue={fmt.money} size={176} stacked /> : <p className="py-10 text-center text-sm text-dark-500">Nenhuma despesa neste mês.</p>}
            </motion.section>
            <motion.section className="panel p-6 lg:col-span-7" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-semibold">Movimentação diária</h2>
                <span className="flex gap-4 text-xs text-dark-500">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Receitas</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Despesas</span>
                </span>
              </div>
              <DailyBars data={summary.byDay} formatValue={fmt.money} formatDay={fmt.date} />
            </motion.section>
          </div>

          <motion.section className="panel p-5 sm:p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: EASE }} aria-labelledby="movimentacoes-titulo">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 id="movimentacoes-titulo" className="text-[15px] font-semibold">Movimentações</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented label="Filtrar por tipo" value={kindFilter} onChange={setKindFilter} options={[{ value: 'todos', label: 'Todas' }, { value: 'receita', label: 'Receitas' }, { value: 'despesa', label: 'Despesas' }, ...(hasImported ? [{ value: 'revisar' as const, label: 'A revisar' }] : [])]} />
                <div className="w-48">
                  <Select
                    aria-label="Filtrar por categoria"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                    options={[{ value: 'todas', label: 'Todas as categorias' }, ...[...new Set([...Object.keys(CATEGORIES), ...entries.map((e) => e.category)])].map((c) => ({ value: c, label: categoryMeta(c).label }))]}
                  />
                </div>
              </div>
            </div>

            {grouped.length === 0 ? (
              <p className="py-10 text-center text-sm text-dark-500">Nenhuma movimentação com esses filtros.</p>
            ) : (
              <div className="mt-5 space-y-5">
                {grouped.map(([date, items]) => (
                  <div key={date}>
                    <p className="mb-2 text-xs font-medium text-dark-500">{fmt.date(date)}</p>
                    <ul className="divide-y divide-dark-200/60 rounded-2xl border border-dark-200/60 bg-dark-50/30">
                      {items.map((entry) => {
                        const meta = categoryMeta(entry.category);
                        const Icon = meta.icon ?? ReceiptText;
                        const income = entry.kind === 'receita';
                        return (
                          <motion.li key={entry.id} layout="position" className="group flex items-center gap-3 px-4 py-3">
                            <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', income ? 'bg-green-500/10 text-green-600' : 'bg-dark-100 text-dark-600')}>
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-dark-900">{entry.description}</span>
                              {entry.note && <span className="block truncate text-xs text-primary-700">{entry.note}</span>}
                              <span className="flex items-center gap-2 text-xs text-dark-500">
                                {meta.label}
                                <span className="inline-flex items-center gap-1">
                                  {entry.source !== 'manual' && <Landmark className="h-3 w-3" />}
                                  {entry.origin ? entry.origin.institution : 'Manual'}
                                </span>
                                {entry.status === 'pending' && <span className="chip-planned !py-0">Pendente</span>}
                                {entry.flow && FLOW_CHIPS[entry.flow] && <span className="chip-planned !py-0">{FLOW_CHIPS[entry.flow]}</span>}
                                {entry.needsReview && <span className="chip !py-0 border-yellow-500/30 bg-yellow-500/10 text-yellow-700">Revisar</span>}
                              </span>
                            </span>
                            <span className={clsx('sensitive whitespace-nowrap text-sm font-semibold', entry.flow && entry.flow !== 'regular' && entry.flow !== 'refund' ? 'text-dark-500' : income ? 'text-green-600' : 'text-dark-900')}>
                              {income ? '+' : '-'}{fmt.money(entry.amount)}
                            </span>
                            <span className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                              <button type="button" onClick={() => { setEditing(entry); setModalOpen(true); }} className="rounded-lg p-1.5 text-dark-500 hover:bg-dark-100 hover:text-dark-900" aria-label={`${entry.source === 'manual' ? 'Editar' : 'Classificar'} ${entry.description}`}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              {entry.source === 'manual' && (
                                <button type="button" onClick={() => remove(entry)} className="rounded-lg p-1.5 text-dark-500 hover:bg-red-500/10 hover:text-red-600" aria-label={`Excluir ${entry.description}`}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </span>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </>
      )}

      </>)}

      <EntryModal isOpen={modalOpen} entry={editing} defaultDate={defaultDateFor(month)} onClose={() => setModalOpen(false)} onSubmit={save} onReclassify={reclassify} />
    </div>
  );
}
