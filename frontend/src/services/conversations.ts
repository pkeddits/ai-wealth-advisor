import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';
import { dbError } from './supabase/errors';

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'done' | 'stopped';
}

export function titleFrom(question: string): string {
  const clean = question.replace(/\s+/g, ' ').trim();
  return clean.length > 48 ? `${clean.slice(0, 47).trimEnd()}…` : clean || 'Nova conversa';
}

/** Conversas do assistente no Supabase (RLS: somente o dono). Guarda apenas o texto das mensagens. */
export const conversationsApi = {
  async list(): Promise<Conversation[]> {
    const { data, error } = await getSupabase().from('ai_conversations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50);
    if (error) throw dbError(error, 'Não foi possível carregar as conversas.');
    return (data ?? []).map((c: any) => ({ id: c.id, title: c.title, updatedAt: c.updated_at }));
  },
  async create(title: string): Promise<string> {
    const { data, error } = await getSupabase().from('ai_conversations').insert({ title: titleFrom(title) }).select('id').single();
    if (error || !data) throw dbError(error, 'Não foi possível criar a conversa.');
    return data.id;
  },
  async rename(id: string, title: string) {
    const value = title.trim().slice(0, 80);
    if (!value) throw new Error('Informe um título.');
    const { error } = await getSupabase().from('ai_conversations').update({ title: value }).eq('id', id);
    if (error) throw dbError(error, 'Não foi possível renomear.');
  },
  async remove(id: string) {
    const { error } = await getSupabase().from('ai_conversations').delete().eq('id', id);
    if (error) throw dbError(error, 'Não foi possível excluir a conversa.');
  },
  async messages(id: string): Promise<StoredMessage[]> {
    const { data, error } = await getSupabase().from('ai_messages').select('id, role, content, status').eq('conversation_id', id).order('created_at').limit(200);
    if (error) throw dbError(error, 'Não foi possível abrir a conversa.');
    return (data ?? []) as StoredMessage[];
  },
  async add(conversationId: string, role: 'user' | 'assistant', content: string, status: 'done' | 'stopped' = 'done') {
    const text = content.trim().slice(0, 8000);
    if (!text) return;
    await getSupabase().from('ai_messages').insert({ conversation_id: conversationId, role, content: text, status });
  },
};

export const useConversations = create<{ list: Conversation[]; loaded: boolean; load: () => Promise<void>; clear: () => void }>((set) => ({
  list: [],
  loaded: false,
  load: async () => {
    try {
      set({ list: await conversationsApi.list(), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  clear: () => set({ list: [], loaded: false }),
}));
