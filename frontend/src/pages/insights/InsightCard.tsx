import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import clsx from 'clsx';
import type { Insight } from '../../domain/insights';
import { tilt } from '../../lib/tilt';

const ICON = { info: Info, warning: AlertTriangle, critical: OctagonAlert, success: CheckCircle2 };
const TONE = {
  info: 'border-blue-500/25 text-blue-600 bg-blue-500/10',
  warning: 'border-yellow-500/30 text-yellow-700 bg-yellow-500/10',
  critical: 'border-red-500/30 text-red-600 bg-red-500/10',
  success: 'border-green-500/30 text-green-600 bg-green-500/10',
};

export function InsightCard({ insight, index = 0, read, onRead }: { insight: Insight; index?: number; read?: boolean; onRead?: () => void }) {
  const Icon = ICON[insight.severity];
  return (
    <motion.li {...tilt} data-tilt="2.5" className={clsx('panel spotlight tilt flex gap-3 p-4', read && 'opacity-60')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: read ? 0.6 : 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', TONE[insight.severity])}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-dark-900">{insight.title}</p>
        <p className="sensitive mt-0.5 text-sm text-dark-600">{insight.body}</p>
        <p className="mt-1 text-xs text-dark-500">Base: {insight.basis}</p>
        {onRead && !read && <button type="button" onClick={onRead} className="-ml-2 mt-1 min-h-10 rounded-lg px-2 text-xs font-medium text-primary-700 hover:underline sm:hidden">Marcar como lido</button>}
      </div>
      {onRead && !read && <button type="button" onClick={onRead} className="hidden self-start text-xs font-medium text-primary-700 hover:underline sm:block">Marcar como lido</button>}
    </motion.li>
  );
}
