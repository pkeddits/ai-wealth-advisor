import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MessagesSquare, Sparkles, X } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { useChatStore } from '../../services/assistant';
import { useConversations } from '../../services/conversations';
import { usePreferences } from '../../store/preferencesStore';
import { isSupabaseMode } from '../../config/appMode';
import { ChatPanel } from './ChatPanel';

export function pageKey(pathname: string, hash = ''): string {
  if (pathname.startsWith('/portfolios')) return 'carteiras';
  if (pathname.startsWith('/financas')) return hash === '#metas' ? 'metas' : hash === '#orcamentos' ? 'orcamentos' : 'financas';
  if (pathname.startsWith('/simulations')) return 'simulacoes';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/alerts')) return 'alertas';
  if (pathname.startsWith('/ai-analysis')) return 'analise';
  if (pathname.startsWith('/settings')) return hash === '#integracoes' ? 'integracoes' : 'configuracoes';
  return 'dashboard';
}

export function FloatingAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showList, setShowList] = useState(false);
  const aiEnabled = usePreferences((s) => s.aiEnabled);
  const conversationId = useChatStore((s) => s.conversationId);
  const title = useConversations((s) => s.list.find((c) => c.id === conversationId)?.title);
  const conversationsLoaded = useConversations((s) => s.loaded);
  const loadConversations = useConversations((s) => s.load);
  useEffect(() => {
    if (open && isSupabaseMode && aiEnabled && !conversationsLoaded) loadConversations();
  }, [open, aiEnabled, conversationsLoaded, loadConversations]);
  const page = pageKey(location.pathname, location.hash);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (location.pathname.startsWith('/ai-analysis')) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Assistente de IA"
            className="panel-glass fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden !rounded-3xl shadow-[0_30px_80px_-30px_rgb(var(--indigo)/0.7)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(620px,calc(100vh-140px))] sm:w-[400px]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ transformOrigin: 'bottom right' }}
          >
            <header className="flex items-center gap-3 border-b border-dark-200/60 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-on-brand"><Sparkles className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-dark-900">Assistente</p>
                <p className="truncate text-xs text-dark-500">{title ?? 'Explica seus números e como usar o site'}</p>
              </div>
              {isSupabaseMode && aiEnabled && (
                <button type="button" onClick={() => setShowList((v) => !v)} aria-pressed={showList} className={`rounded-lg p-1.5 transition-colors ${showList ? 'bg-primary-500/15 text-primary-800' : 'text-dark-500 hover:bg-dark-100 hover:text-dark-900'}`} aria-label="Conversas">
                  <MessagesSquare className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-dark-500 hover:bg-dark-100 hover:text-dark-900" aria-label="Fechar assistente"><X className="h-4 w-4" /></button>
            </header>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <ChatPanel page={page} className="flex-1" autoFocus />
              <AnimatePresence>
                {showList && (
                  <motion.div className="absolute inset-0 z-10 bg-surface-raised" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                    <ConversationList className="h-full" onPick={() => setShowList(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente de IA'}
        className="group fixed bottom-5 right-5 z-40 hidden h-14 w-14 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-[0_16px_40px_-12px_rgb(var(--violet)/0.9)] sm:flex lg:bottom-6 lg:right-6"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24, delay: 0.6 }}
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.25 }}>
          {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </motion.span>
      </motion.button>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-glow sm:hidden" aria-label="Abrir assistente de IA">
          <Sparkles className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
