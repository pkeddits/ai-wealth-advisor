import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, Copy, RotateCcw, Sparkles, Square } from 'lucide-react';
import { conversationsApi, useConversations } from '../../services/conversations';
import clsx from 'clsx';
import { streamChat, useChatStore, type ChatTurn } from '../../services/assistant';
import { usePreferences } from '../../store/preferencesStore';
import { isSupabaseMode } from '../../config/appMode';
import { Markdown } from './Markdown';
import { Switch } from '../settings';

const SUGGESTIONS: Record<string, string[]> = {
  dashboard: ['Qual a diferença entre capital aplicado e valor de mercado?', 'Como está meu resultado realizado?'],
  carteiras: ['Por que o preço médio mudou depois de uma compra?', 'Como registro uma venda?'],
  financas: ['Qual categoria mais pesou neste mês?', 'Por que transferências não entram nas despesas?'],
  metas: ['Quanto preciso guardar por mês para alcançar minha meta?', 'Como registro um aporte?'],
  orcamentos: ['Quais orçamentos estão perto do limite?', 'Como funciona o alerta de orçamento?'],
  simulacoes: ['O que é juros compostos?', 'Qual a diferença entre taxa anual e mensal?'],
  analytics: ['Minha carteira está concentrada?', 'Como comparo receitas e despesas por mês?'],
  integracoes: ['Como funciona a conexão bancária?', 'O que acontece se eu desvincular um banco?'],
  default: ['O que este site faz?', 'Como começo a organizar minhas finanças aqui?'],
};

const newId = () => Math.random().toString(36).slice(2);

function Bubble({ turn, onRetry }: { turn: ChatTurn; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const user = turn.role === 'user';
  return (
    <motion.li
      layout="position"
      initial={user ? { opacity: 0, y: 12, scale: 0.96 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={user ? { type: 'spring', stiffness: 500, damping: 32 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: user ? 'bottom right' : 'top left' }}
      className={clsx('flex gap-2.5', user && 'justify-end')}
    >
      {!user && (
        <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand" aria-hidden="true">
          {turn.status === 'streaming' && <motion.span className="absolute inset-0 rounded-xl bg-primary-500/50" animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />}
          <Sparkles className="relative h-3.5 w-3.5" />
        </span>
      )}
      <div className={clsx('group max-w-[85%] text-[15px]', user ? 'rounded-2xl rounded-br-md bg-primary-500/15 px-4 py-2.5 text-dark-900' : 'min-w-0 text-dark-700')}>
        {user ? (
          <p className="whitespace-pre-wrap">{turn.content}</p>
        ) : turn.content ? (
          <div className="relative">
            <Markdown text={turn.content} />
            {turn.status === 'streaming' && <span className="ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px] animate-pulse-soft rounded-full bg-gradient-to-b from-primary-500 to-blue-500 align-baseline" aria-hidden="true" />}
          </div>
        ) : turn.status === 'streaming' ? (
          <span className="inline-flex items-center gap-2 py-1.5" aria-label="Gerando resposta">
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-primary-500" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }} />
              ))}
            </span>
            <span className="text-xs text-dark-500">Analisando</span>
          </span>
        ) : null}
        {turn.status === 'error' && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-600" role="alert">
            {turn.error}
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"><RotateCcw className="h-3.5 w-3.5" />Tentar de novo</button>
          </p>
        )}
        {turn.status === 'stopped' && <p className="mt-1 text-xs text-dark-500">Resposta interrompida.</p>}
        {!user && turn.content && turn.status !== 'streaming' && (
          <button
            type="button"
            onClick={async () => { await navigator.clipboard?.writeText(turn.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="mt-1.5 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-dark-500 opacity-70 transition-opacity hover:bg-dark-100 hover:text-dark-800 group-hover:opacity-100"
            aria-label="Copiar resposta"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
    </motion.li>
  );
}

export function AiConsent({ compact = false }: { compact?: boolean }) {
  const { aiEnabled, aiShareData, set } = usePreferences();
  if (!isSupabaseMode) return <p className="text-sm text-dark-500">O assistente de IA funciona com uma conta real. Na demonstração, ele não é usado.</p>;
  return (
    <div className={clsx('space-y-3 text-sm', compact ? '' : 'rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4')}>
      <p className="text-dark-600">As perguntas são processadas por um provedor externo de IA (Groq). Os cálculos são feitos pelo Wealth Advisor; a IA apenas explica.</p>
      <label className="flex items-center justify-between gap-4"><span className="text-dark-900">Usar o assistente de IA</span><Switch checked={aiEnabled} onChange={(v) => set('aiEnabled', v)} label="Usar o assistente de IA" /></label>
      <label className="flex items-center justify-between gap-4">
        <span><span className="block text-dark-900">Incluir meu resumo financeiro</span><span className="text-xs text-dark-500">Totais do mês por categoria, metas, orçamentos e carteiras. Sem descrições de transações, contas ou documentos.</span></span>
        <Switch checked={aiShareData} onChange={(v) => set('aiShareData', v)} disabled={!aiEnabled} label="Incluir meu resumo financeiro" />
      </label>
    </div>
  );
}

export function ChatPanel({ page, className, autoFocus }: { page: string; className?: string; autoFocus?: boolean }) {
  const { turns, set, conversationId, open } = useChatStore();
  const reloadConversations = useConversations((st) => st.load);
  const [showJump, setShowJump] = useState(false);
  const { aiEnabled, aiShareData } = usePreferences();
  const [input, setInput] = useState('');
  const controller = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const busy = turns.some((t) => t.status === 'streaming');

  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
    else if (busy) setShowJump(true);
  }, [turns, busy]);

  useEffect(() => {
    if (!conversationId || busy || !isSupabaseMode) return;
    conversationsApi.messages(conversationId).then((messages) => {
      if (useChatStore.getState().conversationId === conversationId && !useChatStore.getState().turns.some((t) => t.status === 'streaming')) {
        set(messages.map((m) => ({ id: m.id, role: m.role, content: m.content, status: m.status })));
      }
    }).catch(() => open(null));
    // Atualiza ao abrir o painel com uma conversa salva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const run = async (history: ChatTurn[], saveTo: string | null) => {
    const answer: ChatTurn = { id: newId(), role: 'assistant', content: '', status: 'streaming' };
    let current = [...history, answer];
    set(current);
    stick.current = true;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const update = (patch: Partial<ChatTurn>) => {
      current = current.map((t) => (t.id === answer.id ? { ...t, ...patch } : t));
      set(current);
    };
    try {
      await streamChat({
        messages: history.filter((t) => t.status !== 'error' && t.content).map((t) => ({ role: t.role, content: t.content })),
        page,
        includeData: aiShareData,
        signal: ctrl.signal,
        onDelta: (text) => update({ content: (current.find((t) => t.id === answer.id)?.content ?? '') + text }),
      });
      update({ status: 'done' });
      const text = current.find((t) => t.id === answer.id)?.content ?? '';
      if (saveTo && text) conversationsApi.add(saveTo, 'assistant', text, 'done').then(reloadConversations).catch(() => undefined);
    } catch (err) {
      if (ctrl.signal.aborted) {
        update({ status: 'stopped' });
        const text = current.find((t) => t.id === answer.id)?.content ?? '';
        if (saveTo && text) conversationsApi.add(saveTo, 'assistant', text, 'stopped').catch(() => undefined);
      }
      else update({ status: 'error', error: err instanceof Error ? err.message : 'O assistente encontrou um erro.' });
    } finally {
      controller.current = null;
    }
  };

  const send = async (text: string) => {
    const question = text.trim().slice(0, 1500);
    if (!question || busy) return;
    setInput('');
    const history: ChatTurn[] = [...turns, { id: newId(), role: 'user', content: question, status: 'done' }];
    set(history);
    let target = conversationId;
    try {
      if (!target) {
        target = await conversationsApi.create(question);
        open(target, history);
      }
      await conversationsApi.add(target, 'user', question);
      reloadConversations();
    } catch {
      target = null;
    }
    run(history, target);
  };

  const retry = () => {
    const lastUser = [...turns].reverse().findIndex((t) => t.role === 'user');
    if (lastUser < 0) return;
    run(turns.slice(0, turns.length - lastUser), conversationId);
  };

  if (!isSupabaseMode || !aiEnabled) {
    return <div className={clsx('p-4', className)}><AiConsent compact /></div>;
  }

  const suggestions = SUGGESTIONS[page] ?? SUGGESTIONS.default;
  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div
        ref={list}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; if (stick.current) setShowJump(false); }}
        className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {turns.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-dark-600">Pergunte sobre suas finanças ou sobre como usar o site.{aiShareData ? '' : ' Para perguntas sobre os seus números, ative "Incluir meu resumo financeiro".'}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-dark-200 bg-dark-50/50 px-3 py-1.5 text-left text-sm text-dark-700 transition-colors hover:border-primary-500/40 hover:bg-primary-500/10">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4" aria-live="polite" aria-busy={busy}>
            <AnimatePresence initial={false}>
              {turns.map((t) => <Bubble key={t.id} turn={t} onRetry={retry} />)}
            </AnimatePresence>
          </ul>
        )}
      </div>
      <AnimatePresence>
        {showJump && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; stick.current = true; setShowJump(false); }}
            className="mx-auto -mt-12 mb-2 flex items-center gap-1 rounded-full border border-dark-200 bg-surface-raised/95 px-3 py-1.5 text-xs text-dark-700 shadow-float backdrop-blur"
          >
            <ArrowDown className="h-3.5 w-3.5" />Ir para o fim
          </motion.button>
        )}
      </AnimatePresence>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="relative border-t border-dark-200/60 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-dark-200 bg-dark-50/60 p-1.5 transition-colors focus-within:border-primary-500/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            maxLength={1500}
            autoFocus={autoFocus}
            placeholder="Escreva sua pergunta"
            aria-label="Pergunta para o assistente"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-dark-900 placeholder:text-dark-500 focus:outline-none"
          />
          {busy ? (
            <button type="button" onClick={() => controller.current?.abort()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-200 text-dark-900 transition-colors hover:bg-dark-300" aria-label="Interromper resposta"><Square className="h-4 w-4" /></button>
          ) : (
            <motion.button whileTap={{ scale: 0.88 }} type="submit" disabled={!input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-on-brand shadow-[0_6px_18px_-8px_rgb(var(--violet)/0.9)] transition-opacity disabled:opacity-40 disabled:shadow-none" aria-label="Enviar pergunta"><ArrowUp className="h-4 w-4" /></motion.button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-dark-500">{aiShareData ? 'Com resumo financeiro calculado pelo sistema.' : 'Sem dados financeiros.'} A IA pode errar; confira os números nas telas.</p>
      </form>
    </div>
  );
}
