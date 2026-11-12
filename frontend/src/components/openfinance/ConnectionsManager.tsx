import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CreditCard, Landmark, RefreshCw, Unlink } from 'lucide-react';
import clsx from 'clsx';
import type { BankConnection } from '../../types';
import { CONNECTION_STATUS, openFinance, OpenFinanceUnavailableError } from '../../services/openFinance';
import { errorMessage } from '../../lib/errorMessage';
import { useDisplayFormat } from '../../lib/displayFormat';
import { Button, Modal } from '../common';
import { ConnectBankButton } from './ConnectBankButton';

const PRODUCT_LABELS: Record<string, string> = { contas: 'Contas e saldos', transacoes: 'Movimentações', investimentos: 'Investimentos' };
const NEEDS_RECONNECT = new Set(['LOGIN_ERROR', 'WAITING_USER_INPUT', 'WAITING_USER_ACTION', 'OUTDATED']);

function InstitutionLogo({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <Landmark className="h-5 w-5 text-primary-700" />;
  return <img src={src} alt="" className="h-7 w-7 object-contain" onError={() => setFailed(true)} />;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'nunca');

export function useConnections() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConnections(await openFinance.connections());
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível carregar as conexões.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { connections, loading, error, reload: load };
}

export function ConnectionsManager() {
  const fmt = useDisplayFormat();
  const { connections, loading, error, reload } = useConnections();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [confirm, setConfirm] = useState<BankConnection | null>(null);
  const [removing, setRemoving] = useState(false);

  const sync = async (id: string, initial = false) => {
    setSyncing(id);
    setMessage(null);
    try {
      const result = await openFinance.sync(id);
      const parts = [`${result.accounts} ${result.accounts === 1 ? 'conta' : 'contas'}`, `${result.created} novas movimentações`, `${result.investments} investimentos`];
      setMessage({ tone: 'ok', text: `${initial ? 'Conexão concluída' : 'Sincronização concluída'}: ${parts.join(', ')}.${result.review ? ` ${result.review} para revisar em Finanças pessoais.` : ''}${result.status === 'UPDATING' ? ' A instituição ainda está enviando dados; sincronize de novo em alguns minutos.' : ''}` });
    } catch (err) {
      if (err instanceof OpenFinanceUnavailableError) setUnavailable(true);
      setMessage({ tone: 'error', text: errorMessage(err, 'Não foi possível sincronizar.') });
    } finally {
      setSyncing(null);
      await reload();
    }
  };

  const disconnect = async () => {
    if (!confirm) return;
    setRemoving(true);
    try {
      await openFinance.disconnect(confirm.id);
      setMessage({ tone: 'ok', text: `${confirm.institutionName} foi desvinculada.` });
      setConfirm(null);
      await reload();
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err, 'Não foi possível desvincular.') });
    } finally {
      setRemoving(false);
    }
  };

  const onError = (text: string) => {
    if (/não configurad/i.test(text)) setUnavailable(true);
    setMessage({ tone: 'error', text });
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary-500/25 bg-primary-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-dark-700">
          A conexão é feita na janela oficial do Open Finance, com autorização na sua instituição. O Wealth Advisor não pede nem guarda senhas bancárias.
        </p>
        <ConnectBankButton onConnected={(id) => sync(id, true)} onError={onError} />
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role={message.tone === 'error' ? 'alert' : 'status'}
            className={clsx('rounded-xl border p-3 text-sm', message.tone === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-700' : 'border-red-500/30 bg-red-500/10 text-red-700')}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
      {unavailable && <p className="text-sm text-dark-500">A conexão bancária ainda não foi configurada neste ambiente.</p>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {loading && !connections.length ? (
        <div className="skeleton h-28 !rounded-2xl" />
      ) : !connections.length ? (
        <p className="rounded-2xl border border-dashed border-dark-200 p-6 text-center text-sm text-dark-500">Nenhuma instituição conectada.</p>
      ) : (
        <ul className="space-y-3">
          {connections.map((c) => {
            const status = CONNECTION_STATUS[c.status] ?? { label: c.status, className: 'chip-planned' };
            return (
              <li key={c.id} className="rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dark-200 bg-dark-100">
                    <InstitutionLogo src={c.institutionLogo} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-dark-900">
                      {c.institutionName}
                      <span className={status.className}>{status.label}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-dark-500">Última sincronização: {when(c.lastSyncedAt)}</p>
                    {c.products.length > 0 && <p className="mt-1 text-xs text-dark-500">Dados disponíveis: {c.products.map((p) => PRODUCT_LABELS[p] ?? p).join(', ')}</p>}
                    {(c.statusMessage || c.lastSyncError) && <p className="mt-2 text-sm text-yellow-700">{c.lastSyncError ?? c.statusMessage}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => sync(c.id)} loading={syncing === c.id} icon={<RefreshCw className="h-4 w-4" />}>
                      Sincronizar agora
                    </Button>
                    <ConnectBankButton
                      connectionId={c.id}
                      size="sm"
                      variant={NEEDS_RECONNECT.has(c.status) ? 'primary' : 'ghost'}
                      label="Reconectar"
                      icon={<RefreshCw className="h-4 w-4" />}
                      onConnected={(id) => sync(id)}
                      onError={onError}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(c)} icon={<Unlink className="h-4 w-4" />}>
                      Desvincular
                    </Button>
                  </div>
                </div>
                {c.accounts.length > 0 && (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {c.accounts.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 rounded-xl border border-dark-200/60 bg-surface px-3 py-2.5">
                        {a.kind === 'CREDIT' ? <CreditCard className="h-4 w-4 text-dark-500" /> : <Landmark className="h-4 w-4 text-dark-500" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-dark-900">{a.name}</span>
                          {a.numberLast4 && <span className="block text-xs text-dark-500">final {a.numberLast4}</span>}
                        </span>
                        {a.balance !== null && (
                          <span className="sensitive whitespace-nowrap text-sm font-medium text-dark-900">
                            {a.kind === 'CREDIT' ? `Fatura ${fmt.money(Math.abs(a.balance))}` : fmt.money(a.balance)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={!!confirm} onClose={() => setConfirm(null)} title="Desvincular instituição" size="sm">
        <div className="space-y-3 text-sm text-dark-700">
          <p>Ao desvincular <strong className="text-dark-900">{confirm?.institutionName}</strong>:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>a autorização de compartilhamento é encerrada;</li>
            <li>contas, saldos, movimentações importadas e investimentos dessa instituição são apagados daqui;</li>
            <li>lançamentos manuais e carteiras continuam como estão.</li>
          </ul>
          <p>Você pode conectar de novo depois; os dados serão importados outra vez.</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={removing} onClick={disconnect}>Desvincular</Button>
        </div>
      </Modal>
    </div>
  );
}
