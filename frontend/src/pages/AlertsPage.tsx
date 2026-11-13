import { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { planningService } from '../services/planning';
import { Button } from '../components/common';
import { usePreferences } from '../store/preferencesStore';
import { useInsights } from './insights/useInsights';
import { InsightCard } from './insights/InsightCard';

const ALERT_KINDS = new Set(['orcamento', 'meta', 'investimento', 'integracao']);

export function AlertsPage() {
  const { insights, error, reload } = useInsights();
  const [read, setRead] = useState<Set<string>>(new Set());
  useEffect(() => { planningService.readAlerts().then(setRead).catch(() => undefined); }, []);
  const notifications = usePreferences((s) => s.notifications);
  const enabled = (kind: string) => (kind === 'meta' ? notifications.goals !== false : kind === 'integracao' ? notifications.integrations !== false : notifications.system !== false);
  const alerts = (insights ?? []).filter((i) => ALERT_KINDS.has(i.kind) && enabled(i.kind));
  const unread = alerts.filter((a) => !read.has(a.key));

  const markRead = async (key: string) => {
    setRead(new Set([...read, key]));
    await planningService.markAlertRead(key).catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-dark-500">Conta</p>
          <h1 className="text-display mt-1 text-[2rem] leading-tight sm:text-[2.4rem]">Alertas</h1>
          <p className="mt-1 max-w-2xl text-dark-600">Gerados por regras quando você abre o app ou atualiza os dados: orçamentos, metas, concentração da carteira, cotações e conexões. Não há monitoramento em segundo plano nem envio por e-mail.</p>
        </div>
        <div className="flex gap-2">
          {unread.length > 1 && <Button variant="ghost" onClick={() => unread.forEach((a) => markRead(a.key))}>Marcar todos como lidos</Button>}
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={reload}>Verificar agora</Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {insights === null ? <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-20 !rounded-panel" />)}</div> : !alerts.length ? (
        <div className="panel-feature px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-500/40 bg-primary-500/10 text-primary-700"><Bell className="h-6 w-6" /></span>
          <h2 className="text-display mt-5 text-2xl">Nenhum alerta</h2>
          <p className="mx-auto mt-2 max-w-md text-dark-600">Quando um orçamento chegar perto do limite, uma meta for alcançada ou uma conexão precisar de atenção, o aviso aparece aqui.</p>
        </div>
      ) : (
        <ul className="space-y-3">{alerts.map((a, i) => <InsightCard key={a.key} insight={a} index={i} read={read.has(a.key)} onRead={() => markRead(a.key)} />)}</ul>
      )}
    </div>
  );
}
