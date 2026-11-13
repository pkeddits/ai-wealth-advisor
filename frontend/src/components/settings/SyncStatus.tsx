import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { usePreferences } from '../../store/preferencesStore';
import { accountSync } from '../../services/accountSync';

const LABELS = {
  local: { icon: HardDrive, text: 'Salvo neste navegador', tone: 'text-dark-500' },
  loading: { icon: Loader2, text: 'Carregando preferências da conta', tone: 'text-dark-500' },
  saving: { icon: Loader2, text: 'Salvando na conta', tone: 'text-dark-500' },
  ready: { icon: CheckCircle2, text: 'Sincronizado com a conta', tone: 'text-green-600' },
  error: { icon: AlertTriangle, text: 'Falha ao sincronizar', tone: 'text-amber-600' },
} as const;

/** Estado da sincronização das preferências com a conta, com nova tentativa em caso de falha. */
export function SyncStatus() {
  const status = usePreferences((s) => s.syncStatus);
  const error = usePreferences((s) => s.syncError);
  const { icon: Icon, text, tone } = LABELS[status];
  const spinning = status === 'loading' || status === 'saving';
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="status" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className={`inline-flex items-center gap-1.5 rounded-full border border-dark-200/70 bg-dark-50/50 px-2.5 py-1 font-medium ${tone}`}
          title={error ?? undefined}
        >
          <Icon className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} aria-hidden="true" />
          {text}
        </motion.span>
      </AnimatePresence>
      {status === 'error' && (
        <>
          {error && <span className="text-dark-500">{error}</span>}
          <button type="button" onClick={() => void accountSync.retry()} className="inline-flex min-h-[32px] items-center gap-1 font-medium text-primary-700 hover:underline">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}
