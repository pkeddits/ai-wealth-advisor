import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronDown, CreditCard, FlaskConical, Landmark, LineChart, ListChecks, Plug, ReceiptText, RefreshCw, ShieldCheck, Unlink } from 'lucide-react';
import clsx from 'clsx';
import type { BankConnection } from '../types';
import { isSupabaseMode } from '../config/appMode';
import { CONNECTION_STATUS, connectionStats, isSandboxConnection, OPEN_FINANCE_ENV, openFinance, openFinanceStats, OpenFinanceUnavailableError, type ConnectionStats, type OpenFinanceStats } from '../services/openFinance';
import { errorMessage } from '../lib/errorMessage';
import { useDisplayFormat } from '../lib/displayFormat';
import { spotlightHandler } from '../hooks/useSpotlight';
import { Button, Modal } from '../components/common';
import { AnimatedNumber } from '../components/motion';
import { ConnectBankButton } from '../components/openfinance/ConnectBankButton';
import { useConnections } from '../components/openfinance/ConnectionsManager';

const EASE = [0.22, 1, 0.36, 1] as const;
const PRODUCT_LABELS: Record<string, string> = { contas: 'Contas e saldos', transacoes: 'Movimentações', investimentos: 'Investimentos' };
const NEEDS_RECONNECT = new Set(['LOGIN_ERROR', 'WAITING_USER_INPUT', 'WAITING_USER_ACTION', 'OUTDATED']);
const count = (v: number) => Math.round(v).toLocaleString('pt-BR');

function ago(iso: string | null) {
  if (!iso) return 'ainda não sincronizada';
  const min = (Date.now() - Date.parse(iso)) / 60000;
  const when = new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (min < 60) return `há ${Math.max(1, Math.round(min))} min (${when})`;
  if (min < 1440) return `há ${Math.round(min / 60)} h (${when})`;
  return when;
}

function Logo({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" className="h-8 w-8 object-contain" onError={() => setFailed(true)} /> : <Landmark className="h-6 w-6 text-primary-700" />;
}

const SANDBOX_SCENARIOS = [
  { user: 'user-ok', password: 'password-ok', result: 'Conexão concluída (código de verificação 123456)' },
  { user: 'user-ok-auth-pending', password: 'password-ok', result: 'Autorização pendente na instituição' },
  { user: 'user-locked', password: 'password-ok', result: 'Conta bloqueada na instituição' },
  { user: 'user-error', password: 'password-ok', result: 'Falha de acesso à instituição' },
];

function SandboxPanel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="panel overflow-hidden" aria-labelledby="sandbox-titulo">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600"><FlaskConical className="h-4 w-4" /></span>
        <span className="flex-1"><span id="sandbox-titulo" className="block text-sm font-medium text-dark-900">Cenários de teste do Sandbox</span><span className="block text-xs text-dark-500">Use no Pluggy Bank para demonstrar conexões. Todos os dados são fictícios.</span></span>
        <ChevronDown className={clsx('h-4 w-4 text-dark-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
            <div className="overflow-x-auto border-t border-dark-200/60 px-5 py-4">
              <table className="w-full min-w-[480px] text-sm">
                <thead><tr className="text-left text-xs text-dark-500"><th className="pb-2 font-medium">Usuário</th><th className="pb-2 font-medium">Senha</th><th className="pb-2 font-medium">O que simula</th></tr></thead>
                <tbody className="divide-y divide-dark-200/60">
                  {SANDBOX_SCENARIOS.map((s) => <tr key={s.user}><td className="py-2 font-mono text-xs text-dark-900">{s.user}</td><td className="py-2 font-mono text-xs text-dark-700">{s.password}</td><td className="py-2 text-dark-600">{s.result}</td></tr>)}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-dark-500">Cenários definidos pela documentação da Pluggy; o resultado exato pode variar conforme atualizações do Sandbox.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function DemoIntegrations() {
  const items = [
    { icon: Landmark, title: 'Contas bancárias', text: 'Saldos, Pix e extratos importados com a sua autorização.' },
    { icon: CreditCard, title: 'Cartões de crédito', text: 'Compras e faturas sem digitar cada lançamento.' },
    { icon: LineChart, title: 'Investimentos', text: 'Posições informadas pelas instituições, separadas das suas carteiras.' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(({ icon: Icon, title, text }, i) => (
        <motion.div key={title} className="panel p-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: EASE }}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-200 bg-dark-100 text-primary-700"><Icon className="h-5 w-5" /></span>
          <p className="mt-4 font-medium text-dark-900">{title}</p>
          <p className="mt-1 text-sm text-dark-500">{text}</p>
          <span className="chip-planned mt-4">Com conta real</span>
        </motion.div>
      ))}
    </div>
  );
}

export function IntegrationsPage() {
  const fmt = useDisplayFormat();
  const { connections, loading, error, reload } = useConnections();
  const [stats, setStats] = useState<OpenFinanceStats | null>(null);
  const [perConnection, setPerConnection] = useState<Record<string, ConnectionStats>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => { if (isSupabaseMode && connections.length) connectionStats(connections).then(setPerConnection).catch(() => undefined); }, [connections]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BankConnection | null>(null);
  const [removing, setRemoving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const loadStats = useCallback(() => { if (isSupabaseMode) openFinanceStats().then(setStats).catch(() => undefined); }, []);
  useEffect(loadStats, [loadStats]);

  const refresh = async () => { await reload(); loadStats(); };
  const sync = async (id: string, initial = false) => {
    setSyncing(id);
    setMessage(null);
    try {
      const r = await openFinance.sync(id);
      setMessage({ tone: 'ok', text: `${initial ? 'Conexão concluída' : 'Sincronização concluída'}: ${r.accounts} ${r.accounts === 1 ? 'conta' : 'contas'}, ${r.created} novas movimentações, ${r.updated} atualizadas, ${r.investments} investimentos.${r.review ? ` ${r.review} para revisar.` : ''}${r.status === 'UPDATING' ? ' A instituição ainda está enviando dados; sincronize de novo em alguns minutos.' : ''}` });
    } catch (err) {
      if (err instanceof OpenFinanceUnavailableError) setUnavailable(true);
      setMessage({ tone: 'error', text: errorMessage(err, 'Não foi possível sincronizar.') });
    } finally {
      setSyncing(null);
      await refresh();
    }
  };
  const onError = (text: string) => { if (/não configurad/i.test(text)) setUnavailable(true); setMessage({ tone: 'error', text }); };

  const accounts = connections.reduce((s, c) => s + c.accounts.length, 0);
  const summary = [
    { label: 'Instituições', value: connections.length },
    { label: 'Contas vinculadas', value: accounts },
    { label: 'Movimentações importadas', value: stats?.importedEntries ?? 0 },
    { label: 'Investimentos ativos', value: stats?.investmentsActive ?? 0 },
    { label: 'Para revisar', value: stats?.toReview ?? 0, tone: (stats?.toReview ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="panel-feature relative overflow-hidden p-6 sm:p-8">
        <div className="fx-decor pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-[90px]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm text-dark-500"><Plug className="h-4 w-4" />Integrações</p>
            <h1 className="text-display mt-2 text-[2rem] leading-tight sm:text-[2.4rem]">Central de Integrações</h1>
            <p className="mt-2 text-dark-600">Conecte suas instituições pelo Open Finance para importar contas, movimentações e investimentos. A autorização acontece na própria instituição; o Wealth Advisor não pede nem guarda senhas bancárias.</p>
            {isSupabaseMode && OPEN_FINANCE_ENV === 'sandbox' && (
              <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700"><FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />Ambiente de testes: disponível o Pluggy Bank, com dados fictícios. A conexão com bancos reais será habilitada após a aprovação do acesso de produção pela Pluggy.</p>
            )}
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-dark-500"><ShieldCheck className="h-4 w-4 text-green-600" />Você pode sincronizar, reconectar ou desvincular a qualquer momento.</p>
          </div>
          {isSupabaseMode && <ConnectBankButton size="lg" onConnected={(id) => sync(id, true)} onError={onError} />}
        </div>
      </section>

      {!isSupabaseMode ? (
        <>
          <p className="text-sm text-dark-500">A conexão bancária exige uma conta real. Na demonstração, nenhuma instituição é conectada.</p>
          <DemoIntegrations />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {summary.map((s, i) => (
              <motion.div key={s.label} onPointerMove={spotlightHandler} className="panel spotlight p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: EASE }}>
                <AnimatedNumber value={s.value} format={count} className={clsx('block text-2xl font-semibold tracking-tight', s.tone ? 'text-yellow-700' : 'text-dark-900')} />
                <p className="mt-1 text-xs text-dark-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
          {OPEN_FINANCE_ENV === 'sandbox' && <SandboxPanel />}
          {stats && stats.investmentsWithdrawn > 0 && <p className="text-xs text-dark-500">{stats.investmentsWithdrawn} {stats.investmentsWithdrawn === 1 ? 'investimento recebido está totalmente resgatado' : 'investimentos recebidos estão totalmente resgatados'} e aparece{stats.investmentsWithdrawn === 1 ? '' : 'm'} separado{stats.investmentsWithdrawn === 1 ? '' : 's'} em Carteiras → Meus bancos.</p>}
          {(stats?.toReview ?? 0) > 0 && <Link to="/financas" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">Revisar movimentações em Finanças pessoais <ArrowRight className="h-4 w-4" /></Link>}

          <AnimatePresence>
            {message && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={message.tone === 'error' ? 'alert' : 'status'} className={clsx('rounded-2xl border p-4 text-sm', message.tone === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-700' : 'border-red-500/30 bg-red-500/10 text-red-700')}>
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
          {unavailable && <p className="text-sm text-dark-500">A conexão bancária ainda não foi configurada neste ambiente.</p>}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          {loading && !connections.length ? (
            <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-64 !rounded-panel" />)}</div>
          ) : !connections.length ? (
            <motion.div className="panel px-6 py-14 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700"><Landmark className="h-6 w-6" /></span>
              <h2 className="text-display mt-5 text-2xl">Nenhuma instituição conectada</h2>
              <p className="mx-auto mt-2 max-w-md text-dark-600">Use "Conectar banco" para escolher sua instituição. Você pode conectar mais de uma.</p>
            </motion.div>
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {connections.map((c, i) => {
                const status = CONNECTION_STATUS[c.status] ?? { label: c.status, className: 'chip-planned' };
                const stale = !!c.lastSyncError || NEEDS_RECONNECT.has(c.status);
                const st = perConnection[c.id];
                const many = c.accounts.length > 3 && !expanded[c.id];
                const metrics = [
                  { icon: Landmark, label: 'Contas', value: c.accounts.length },
                  { icon: ReceiptText, label: 'Movimentações', value: st?.entries },
                  { icon: LineChart, label: 'Investimentos', value: st?.investments, hint: st?.withdrawn ? `+${st.withdrawn} resgatado${st.withdrawn > 1 ? 's' : ''}` : undefined },
                  { icon: ListChecks, label: 'Para revisar', value: st?.review, warn: (st?.review ?? 0) > 0 },
                ];
                return (
                  <motion.li key={c.id} layout onPointerMove={spotlightHandler} className="panel spotlight lift flex flex-col p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: EASE }}>
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dark-200 bg-dark-100"><Logo src={c.institutionLogo} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold tracking-tight">
                          <span className="truncate">{c.institutionName}</span>
                          <span className={status.className}>{status.label}</span>
                          {isSandboxConnection(c.institutionName) && <span className="chip border-blue-500/30 bg-blue-500/10 text-blue-700">Sandbox · dados fictícios</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-dark-500">Última sincronização: {ago(c.lastSyncedAt)}</p>
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {metrics.map((m) => (
                        <div key={m.label} className="rounded-xl border border-dark-200/60 bg-dark-50/40 px-3 py-2.5">
                          <dt className="flex items-center gap-1.5 text-[11px] text-dark-500"><m.icon className="h-3.5 w-3.5" />{m.label}</dt>
                          <dd className={clsx('mt-0.5 text-lg font-semibold tracking-tight', m.warn ? 'text-yellow-700' : 'text-dark-900')}>{m.value === undefined ? <span className="skeleton inline-block h-5 w-8 align-middle" /> : m.value.toLocaleString('pt-BR')}</dd>
                          {m.hint && <dd className="text-[11px] text-dark-500">{m.hint}</dd>}
                        </div>
                      ))}
                    </dl>
                    {(c.statusMessage || c.lastSyncError) && <p className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700">{c.lastSyncError ?? c.statusMessage}{stale ? ' Os dados exibidos podem estar desatualizados.' : ''}</p>}
                    {c.accounts.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {(many ? c.accounts.slice(0, 3) : c.accounts).map((a) => (
                          <li key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-dark-100/50">
                            {a.kind === 'CREDIT' ? <CreditCard className="h-4 w-4 text-dark-500" /> : <Landmark className="h-4 w-4 text-dark-500" />}
                            <span className="min-w-0 flex-1 truncate text-sm text-dark-900">{a.name}{a.numberLast4 && <span className="ml-1.5 text-xs text-dark-500">final {a.numberLast4}</span>}</span>
                            {a.balance !== null && <span className="sensitive whitespace-nowrap text-sm font-medium text-dark-900">{a.kind === 'CREDIT' ? `Fatura ${fmt.money(Math.abs(a.balance))}` : fmt.money(a.balance)}</span>}
                          </li>
                        ))}
                        {c.accounts.length > 3 && <li><button type="button" onClick={() => setExpanded({ ...expanded, [c.id]: !expanded[c.id] })} className="px-2 text-xs font-medium text-primary-700 hover:underline">{many ? `Ver todas as ${c.accounts.length} contas` : 'Mostrar menos'}</button></li>}
                      </ul>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-dark-200/60 pt-4 [&]:mt-4">
                      <Button size="sm" variant="secondary" onClick={() => sync(c.id)} loading={syncing === c.id} icon={<RefreshCw className="h-4 w-4" />}>Sincronizar</Button>
                      <ConnectBankButton connectionId={c.id} size="sm" variant={NEEDS_RECONNECT.has(c.status) ? 'primary' : 'ghost'} label="Reconectar" icon={<RefreshCw className="h-4 w-4" />} onConnected={(id) => sync(id)} onError={onError} />
                      <Button size="sm" variant="ghost" onClick={() => setConfirm(c)} icon={<Unlink className="h-4 w-4" />}>Desvincular</Button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Modal isOpen={!!confirm} onClose={() => setConfirm(null)} title="Desvincular instituição" size="sm">
        <div className="space-y-3 text-sm text-dark-700">
          <p>Ao desvincular <strong className="text-dark-900">{confirm?.institutionName}</strong>:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>a autorização de compartilhamento é encerrada;</li>
            <li>contas, saldos, movimentações importadas e investimentos dessa instituição são apagados daqui;</li>
            <li>lançamentos manuais, metas e carteiras continuam como estão.</li>
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={removing} onClick={async () => {
            if (!confirm) return;
            setRemoving(true);
            try { await openFinance.disconnect(confirm.id); setMessage({ tone: 'ok', text: `${confirm.institutionName} foi desvinculada.` }); setConfirm(null); await refresh(); }
            catch (err) { setMessage({ tone: 'error', text: errorMessage(err, 'Não foi possível desvincular.') }); }
            finally { setRemoving(false); }
          }}>Desvincular</Button>
        </div>
      </Modal>
    </div>
  );
}
