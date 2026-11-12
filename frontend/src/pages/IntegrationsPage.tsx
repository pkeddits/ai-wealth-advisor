import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CreditCard, Landmark, LineChart, Plug, RefreshCw, ShieldCheck, Unlink } from 'lucide-react';
import clsx from 'clsx';
import type { BankConnection } from '../types';
import { isSupabaseMode } from '../config/appMode';
import { CONNECTION_STATUS, openFinance, openFinanceStats, OpenFinanceUnavailableError, type OpenFinanceStats } from '../services/openFinance';
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
            <ul className="grid gap-4 lg:grid-cols-2">
              {connections.map((c, i) => {
                const status = CONNECTION_STATUS[c.status] ?? { label: c.status, className: 'chip-planned' };
                const stale = !!c.lastSyncError || NEEDS_RECONNECT.has(c.status);
                return (
                  <motion.li key={c.id} onPointerMove={spotlightHandler} className="panel spotlight flex flex-col p-5 sm:p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: EASE }}>
                    <div className="flex items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dark-200 bg-dark-100"><Logo src={c.institutionLogo} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold tracking-tight">{c.institutionName}<span className={status.className}>{status.label}</span></p>
                        <p className="mt-1 text-sm text-dark-500">Última sincronização: {ago(c.lastSyncedAt)}</p>
                      </div>
                    </div>
                    {(c.statusMessage || c.lastSyncError) && <p className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700">{c.lastSyncError ?? c.statusMessage}{stale ? ' Os dados exibidos podem estar desatualizados.' : ''}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(c.products.length ? c.products : ['nenhum dado ainda']).map((p) => <span key={p} className="chip-planned">{PRODUCT_LABELS[p] ?? p}</span>)}
                    </div>
                    {c.accounts.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {c.accounts.map((a) => (
                          <li key={a.id} className="flex items-center gap-3 rounded-xl border border-dark-200/60 bg-dark-50/40 px-3 py-2.5">
                            {a.kind === 'CREDIT' ? <CreditCard className="h-4 w-4 text-dark-500" /> : <Landmark className="h-4 w-4 text-dark-500" />}
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm text-dark-900">{a.name}</span>{a.numberLast4 && <span className="block text-xs text-dark-500">final {a.numberLast4}</span>}</span>
                            {a.balance !== null && <span className="sensitive whitespace-nowrap text-sm font-medium text-dark-900">{a.kind === 'CREDIT' ? `Fatura ${fmt.money(Math.abs(a.balance))}` : fmt.money(a.balance)}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-dark-200/60 pt-4">
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
