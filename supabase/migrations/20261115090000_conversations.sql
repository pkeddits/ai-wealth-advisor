-- Fase 7: conversas do assistente e aporte mensal planejado das metas.
-- As conversas guardam apenas o texto da pergunta e da resposta final: nenhum resumo financeiro,
-- raciocínio do modelo ou credencial é persistido.

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  status text not null default 'done' check (status in ('done', 'stopped')),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id) references public.ai_conversations (id, user_id) on delete cascade
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- Nova mensagem atualiza a ordem da conversa na lista.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_conversations set updated_at = now() where id = new.conversation_id and user_id = new.user_id;
  return new;
end;
$$;

revoke execute on function public.touch_conversation() from public, anon;
grant execute on function public.touch_conversation() to authenticated, service_role;

create trigger ai_messages_touch_conversation after insert on public.ai_messages for each row execute function public.touch_conversation();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "ai_conversations: dono" on public.ai_conversations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ai_messages: dono" on public.ai_messages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.ai_conversations, public.ai_messages from anon, authenticated;
grant select, delete on public.ai_conversations, public.ai_messages to authenticated;
grant insert (title), update (title) on public.ai_conversations to authenticated;
grant insert (conversation_id, role, content, status) on public.ai_messages to authenticated;

-- Aporte mensal planejado (projeção explícita, separada do valor efetivamente guardado).
alter table public.goals add column planned_monthly numeric(14, 2) check (planned_monthly is null or planned_monthly > 0);
grant insert (planned_monthly), update (planned_monthly) on public.goals to authenticated;
