-- Open Finance (Pluggy): conexões, contas, transações importadas e investimentos.
-- Os dados importados são gravados apenas pelo servidor (service role), após verificar a
-- propriedade da conexão; usuários autenticados só leem os próprios registros.

create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'pluggy' check (provider in ('pluggy')),
  item_id text not null check (char_length(item_id) between 1 and 100),
  institution_name text not null check (char_length(institution_name) between 1 and 120),
  institution_logo text check (institution_logo is null or institution_logo ~ '^https://'),
  status text not null check (char_length(status) <= 40),
  status_message text check (char_length(status_message) <= 300),
  products text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_error text check (char_length(last_sync_error) <= 300),
  sync_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, item_id)
);

create index bank_connections_user_idx on public.bank_connections (user_id);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.bank_connections (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 100),
  kind text not null check (kind in ('BANK', 'CREDIT')),
  subtype text check (char_length(subtype) <= 40),
  name text not null check (char_length(name) between 1 and 120),
  number_last4 text check (number_last4 ~ '^[0-9]{1,4}$'),
  currency char(3) not null default 'BRL',
  balance numeric(16, 2),
  credit_limit numeric(16, 2),
  balance_reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index bank_accounts_user_idx on public.bank_accounts (user_id);

-- Transações bancárias importadas reaproveitam finance_entries (source = 'open_finance').
alter table public.finance_entries
  add column account_id uuid references public.bank_accounts (id) on delete cascade,
  add column status text not null default 'posted' check (status in ('posted', 'pending')),
  -- regular: receita/despesa real; transfer: entre contas próprias; investment: aplicação/resgate;
  -- card_payment: pagamento de fatura (as compras já estão no cartão); refund: estorno de despesa.
  add column flow text not null default 'regular' check (flow in ('regular', 'transfer', 'investment', 'card_payment', 'refund')),
  add column needs_review boolean not null default false,
  add column user_classified boolean not null default false,
  add column synced_at timestamptz,
  add constraint finance_entries_imported_account check ((source = 'manual') = (account_id is null));

-- Deduplicação por usuário, origem, conta e identificador externo (o id externo não é tratado como global).
drop index public.finance_entries_external_uidx;
create unique index finance_entries_external_uidx
  on public.finance_entries (user_id, source, account_id, external_id)
  where external_id is not null;

create index finance_entries_account_idx on public.finance_entries (account_id) where account_id is not null;

-- Importados preservam valor, tipo e data da instituição. O usuário pode reclassificar (categoria,
-- natureza, revisão); a sincronização respeita essa escolha. O servidor (service role) atualiza os dados.
create or replace function public.protect_imported_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'service_role' or coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if old.source <> 'manual' then
    if (new.amount, new.kind, new.occurred_on) is distinct from (old.amount, old.kind, old.occurred_on) then
      raise exception 'Lançamentos importados não podem ter valor, tipo ou data alterados.'
        using errcode = 'check_violation';
    end if;
    new.user_classified := true;
  end if;
  return new;
end;
$$;

drop policy "finance_entries: exclusão" on public.finance_entries;
create policy "finance_entries: exclusão de lançamentos manuais"
  on public.finance_entries for delete to authenticated
  using (user_id = (select auth.uid()) and source = 'manual');

grant update (flow, needs_review) on public.finance_entries to authenticated;

create table public.investment_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.bank_connections (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 200),
  code text check (char_length(code) <= 40),
  isin text check (char_length(isin) <= 20),
  type text not null check (char_length(type) <= 40),
  subtype text check (char_length(subtype) <= 40),
  status text check (char_length(status) <= 30),
  currency char(3) not null default 'BRL',
  quantity numeric(24, 8),
  unit_value numeric(20, 8),
  balance numeric(16, 2),
  amount_original numeric(16, 2),
  issuer text check (char_length(issuer) <= 200),
  due_date date,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index investment_positions_user_idx on public.investment_positions (user_id);

create table public.investment_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  position_id uuid not null references public.investment_positions (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 100),
  type text not null check (type in ('BUY', 'SELL', 'TAX', 'TRANSFER', 'INTEREST', 'AMORTIZATION', 'OTHER')),
  quantity numeric(24, 8),
  unit_value numeric(20, 8),
  amount numeric(16, 2),
  traded_on date,
  created_at timestamptz not null default now(),
  unique (position_id, external_id)
);

create index investment_movements_user_idx on public.investment_movements (user_id);

create trigger bank_connections_set_updated_at before update on public.bank_connections for each row execute function public.set_updated_at();
create trigger bank_accounts_set_updated_at before update on public.bank_accounts for each row execute function public.set_updated_at();
create trigger investment_positions_set_updated_at before update on public.investment_positions for each row execute function public.set_updated_at();

alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.investment_positions enable row level security;
alter table public.investment_movements enable row level security;

create policy "bank_connections: leitura" on public.bank_connections for select to authenticated using (user_id = (select auth.uid()));
create policy "bank_accounts: leitura" on public.bank_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "investment_positions: leitura" on public.investment_positions for select to authenticated using (user_id = (select auth.uid()));
create policy "investment_movements: leitura" on public.investment_movements for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.bank_connections, public.bank_accounts, public.investment_positions, public.investment_movements from anon, authenticated;
grant select on public.bank_connections, public.bank_accounts, public.investment_positions, public.investment_movements to authenticated;
