import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, MessageSquarePlus, MessagesSquare, Pencil, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { conversationsApi, useConversations } from '../../services/conversations';
import { useChatStore } from '../../services/assistant';

const relative = (iso: string) => {
  const diff = (Date.now() - Date.parse(iso)) / 60000;
  if (diff < 1) return 'agora';
  if (diff < 60) return `há ${Math.round(diff)} min`;
  if (diff < 1440) return `há ${Math.round(diff / 60)} h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export function ConversationList({ onPick, className }: { onPick?: () => void; className?: string }) {
  const { list, loaded, load } = useConversations();
  const { conversationId, open } = useChatStore();
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const pick = async (id: string) => {
    setError('');
    try {
      const messages = await conversationsApi.messages(id);
      open(id, messages.map((m) => ({ id: m.id, role: m.role, content: m.content, status: m.status })));
      onPick?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir a conversa.');
    }
  };

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <button type="button" onClick={() => { open(null); onPick?.(); }} className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-xl border border-primary-500/40 bg-primary-500/10 px-3 py-2 text-sm font-medium text-primary-800 transition-colors hover:bg-primary-500/20">
        <MessageSquarePlus className="h-4 w-4" />Nova conversa
      </button>
      {error && <p className="mx-3 mt-2 text-xs text-red-600" role="alert">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {!loaded ? <div className="space-y-2 px-1">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10" />)}</div> : !list.length ? (
          <div className="px-3 py-8 text-center text-sm text-dark-500"><MessagesSquare className="mx-auto mb-2 h-6 w-6 text-dark-400" />Suas conversas aparecem aqui.</div>
        ) : (
          <ul className="space-y-0.5" aria-label="Conversas anteriores">
            <AnimatePresence initial={false}>
              {list.map((c) => (
                <motion.li key={c.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="group">
                  {editing?.id === c.id ? (
                    <form onSubmit={async (e) => { e.preventDefault(); try { await conversationsApi.rename(c.id, editing.title); setEditing(null); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); } }} className="flex items-center gap-1 px-1">
                      <input autoFocus value={editing.title} maxLength={80} onChange={(e) => setEditing({ id: c.id, title: e.target.value })} aria-label="Título da conversa" className="min-w-0 flex-1 rounded-lg border border-dark-200 bg-dark-50 px-2 py-1.5 text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
                      <button type="submit" className="rounded-lg p-1.5 text-green-600 hover:bg-green-500/10" aria-label="Salvar título"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-dark-500 hover:bg-dark-100" aria-label="Cancelar"><X className="h-4 w-4" /></button>
                    </form>
                  ) : (
                    <div className={clsx('flex items-center gap-1 rounded-xl pr-1 transition-colors', c.id === conversationId ? 'bg-primary-500/15' : 'hover:bg-dark-100/70')}>
                      <button type="button" onClick={() => pick(c.id)} aria-current={c.id === conversationId ? 'true' : undefined} className="min-w-0 flex-1 px-3 py-2 text-left">
                        <span className="block truncate text-sm text-dark-900">{c.title}</span>
                        <span className="block text-[11px] text-dark-500">{relative(c.updatedAt)}</span>
                      </button>
                      <button type="button" onClick={() => setEditing({ id: c.id, title: c.title })} className="rounded-lg p-1.5 text-dark-500 opacity-0 transition-opacity hover:bg-dark-200/60 hover:text-dark-900 focus:opacity-100 group-hover:opacity-100" aria-label={`Renomear ${c.title}`}><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={async () => { if (!window.confirm(`Excluir a conversa "${c.title}"?`)) return; await conversationsApi.remove(c.id).catch(() => undefined); if (c.id === conversationId) open(null); await load(); }} className="rounded-lg p-1.5 text-dark-500 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 focus:opacity-100 group-hover:opacity-100" aria-label={`Excluir ${c.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
