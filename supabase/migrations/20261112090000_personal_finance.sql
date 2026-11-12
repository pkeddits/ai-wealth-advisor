-- Finanças pessoais: receitas e despesas lançadas manualmente, preparadas para importação
-- futura via Open Finance sem duplicar registros.

create type public.entry_kind as enum ('receita', 'despesa');
create type public.entry_source as enum ('manual', 'open_finance');

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.entry_kind not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (category in (
    'alimentacao', 'transporte', 'moradia', 'lazer', 'saude', 'educacao', 'salario', 'outros'
  )),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  occurred_on date not null check (occurred_on >= date '2000-01-01'),
  source public.entry_source not null default 'manual',
  -- Identificador da transação na instituição de origem; nulo para lançamentos manuais.
  external_id text check (char_length(external_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((source = 'manual') = (external_id is null))
);

create index finance_entries_user_date_idx on public.finance_entries (user_id, occurred_on desc);

-- Evita importar duas vezes a mesma transação da mesma origem.
create unique index finance_entries_external_uidx
  on public.finance_entries (user_id, source, external_id)
  where external_id is not null;

create trigger finance_entries_set_updated_at
  before update on public.finance_entries
  for each row execute function public.set_updated_at();

-- Lançamentos importados preservam valor, tipo e data da instituição; o usuário só recategoriza.
create or replace function public.protect_imported_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source <> 'manual' and (new.amount, new.kind, new.occurred_on) is distinct from (old.amount, old.kind, old.occurred_on) then
    raise exception 'Lançamentos importados não podem ter valor, tipo ou data alterados.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger finance_entries_protect_imported
  before update on public.finance_entries
  for each row execute function public.protect_imported_entry();

alter table public.finance_entries enable row level security;

create policy "finance_entries: leitura"
  on public.finance_entries for select to authenticated
  using (user_id = (select auth.uid()));

create policy "finance_entries: criação manual"
  on public.finance_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'manual');

create policy "finance_entries: edição"
  on public.finance_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "finance_entries: exclusão"
  on public.finance_entries for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.finance_entries from anon, authenticated;
grant select, delete on public.finance_entries to authenticated;
grant insert (kind, amount, category, description, occurred_on) on public.finance_entries to authenticated;
grant update (kind, amount, category, description, occurred_on) on public.finance_entries to authenticated;
