import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getSupabase } from '../lib/supabase';
import type { Insight } from '../domain/insights';
import { readApiError } from './apiError';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'done' | 'error' | 'stopped';
  error?: string;
}

interface ChatState {
  turns: ChatTurn[];
  /** Usuário dono da conversa salva; outra conta nunca a reaproveita. */
  owner: string | null;
  /** Conversa ativa, compartilhada entre o chatbot flutuante e a Análise IA. */
  conversationId: string | null;
  set: (turns: ChatTurn[]) => void;
  open: (conversationId: string | null, turns?: ChatTurn[]) => void;
  reset: (owner?: string | null) => void;
}

/**
 * Conversa da sessão, compartilhada entre o chatbot flutuante e a página Análise IA.
 * Fica no sessionStorage (some ao fechar a aba) e é apagada no logout.
 */
export const useChatStore = create<ChatState>()(
  persist((set) => ({
    turns: [],
    owner: null,
    conversationId: null,
    set: (turns) => set({ turns: turns.slice(-60) }),
    open: (conversationId, turns = []) => set({ conversationId, turns }),
    reset: (owner = null) => set({ turns: [], owner, conversationId: null }),
  }), {
    name: 'aiwa.chat.v1',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ turns: state.turns, owner: state.owner, conversationId: state.conversationId }),
    onRehydrateStorage: () => (state) => {
      if (state) state.turns = state.turns.map((t) => (t.status === 'streaming' ? { ...t, status: 'stopped' } : t));
    },
  }),
);

async function token() {
  const { data } = await getSupabase().auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Sua sessão expirou. Entre novamente.');
  return t;
}

export interface StreamOptions {
  messages: { role: 'user' | 'assistant'; content: string }[];
  page?: string;
  includeData: boolean;
  intent?: 'chat' | 'diagnosis';
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

/** Lê a resposta à medida que o servidor repassa os trechos gerados pelo modelo. */
export async function streamChat({ messages, page, includeData, intent = 'chat', signal, onDelta }: StreamOptions): Promise<void> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, page, includeData, intent }),
  });
  if (!res.ok || !res.body) {
    const info = await readApiError(res, 'O assistente não está disponível no momento.');
    throw Object.assign(new Error(info.message), { code: info.code });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 2);
      if (!line.startsWith('data:')) continue;
      let event: { type: string; text?: string; message?: string };
      try {
        event = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (event.type === 'delta' && event.text) onDelta(event.text);
      if (event.type === 'error') throw new Error(event.message ?? 'O assistente encontrou um erro.');
    }
  }
}

export interface SnapshotResponse {
  data: Record<string, unknown>;
  insights: Insight[];
  aiConfigured: boolean;
}

export async function fetchSnapshot(): Promise<SnapshotResponse> {
  const res = await fetch('/api/ai/snapshot', { method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: '{}' });
  if (!res.ok) throw new Error((await readApiError(res, 'Não foi possível calcular o resumo.')).message);
  return (await res.json()) as SnapshotResponse;
}
