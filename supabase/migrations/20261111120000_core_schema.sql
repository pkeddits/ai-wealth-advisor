-- Núcleo financeiro: perfis, carteiras, ativos e transações.
-- Todas as tabelas privadas usam RLS; cada usuário acessa apenas os próprios registros.

create type public.risk_profile as enum ('conservador', 'moderado', 'arrojado');
create type public.asset_class as enum ('acoes', 'fiis', 'etfs', 'renda_fixa', 'cripto', 'internacional');
create type public.transaction_type as enum ('compra', 'venda');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  risk_profile public.risk_profile not null default 'moderado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil a partir dos metadados informados no cadastro (supabase.auth.signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_profile text := new.raw_user_meta_data ->> 'risk_profile';
begin
  insert into public.profiles (id, full_name, risk_profile)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 120),
    case
      when requested_profile in ('conservador', 'moderado', 'arrojado')
        then requested_profile::public.risk_profile
      else 'moderado'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- portfolios -------------------------------------------------------------

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text check (char_length(description) <= 500),
  risk_profile public.risk_profile not null default 'moderado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Alvo da FK composta de transactions: garante que a transação pertence ao dono da carteira.
  unique (id, user_id)
);

create index portfolios_user_id_idx on public.portfolios (user_id);

create trigger portfolios_set_updated_at
  before update on public.portfolios
  for each row execute function public.set_updated_at();

-- assets (catálogo compartilhado, somente leitura para usuários) ---------

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique check (symbol = upper(symbol) and char_length(symbol) between 1 and 20),
  name text not null check (char_length(name) between 1 and 160),
  asset_class public.asset_class not null,
  sector text,
  exchange text,
  currency char(3) not null default 'BRL' check (currency = upper(currency)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_asset_class_idx on public.assets (asset_class) where is_active;

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- transactions -----------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  user_id uuid not null default auth.uid(),
  asset_id uuid not null references public.assets (id) on delete restrict,
  type public.transaction_type not null,
  quantity numeric(20, 8) not null check (quantity > 0),
  price numeric(20, 8) not null check (price > 0),
  fees numeric(14, 2) not null default 0 check (fees >= 0),
  traded_on date not null,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (portfolio_id, user_id)
    references public.portfolios (id, user_id) on delete cascade
);

create index transactions_portfolio_asset_idx
  on public.transactions (portfolio_id, asset_id, traded_on, created_at);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_asset_id_idx on public.transactions (asset_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create or replace function public.validate_transaction_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.traded_on > current_date then
    raise exception 'A data da operação não pode estar no futuro.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger transactions_validate_date
  before insert or update of traded_on on public.transactions
  for each row execute function public.validate_transaction_date();

-- Saldo por ativo em ordem cronológica (data, depois momento do registro),
-- a mesma regra de frontend/src/domain/positions.ts. Nenhuma venda pode
-- deixar o saldo negativo, inclusive após editar ou excluir uma compra.
create or replace function public.ensure_non_negative_holding(p_portfolio_id uuid, p_asset_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  lowest numeric;
begin
  select min(running) into lowest
  from (
    select sum(case when t.type = 'compra' then t.quantity else -t.quantity end)
             over (order by t.traded_on, t.created_at, t.id) as running
    from public.transactions t
    where t.portfolio_id = p_portfolio_id and t.asset_id = p_asset_id
  ) balances;

  if lowest < 0 then
    raise exception 'Venda maior que a quantidade disponível do ativo nesta carteira.'
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.check_holding_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.ensure_non_negative_holding(old.portfolio_id, old.asset_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.ensure_non_negative_holding(new.portfolio_id, new.asset_id);
  end if;
  return null;
end;
$$;

create constraint trigger transactions_check_holding_balance
  after insert or update or delete on public.transactions
  deferrable initially immediate
  for each row execute function public.check_holding_balance();

-- Row Level Security -----------------------------------------------------

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;
alter table public.assets enable row level security;
alter table public.transactions enable row level security;

create policy "profiles: leitura do próprio perfil"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: edição do próprio perfil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "portfolios: leitura"
  on public.portfolios for select to authenticated
  using (user_id = (select auth.uid()));

create policy "portfolios: criação"
  on public.portfolios for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "portfolios: edição"
  on public.portfolios for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "portfolios: exclusão"
  on public.portfolios for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "assets: leitura do catálogo ativo"
  on public.assets for select to authenticated
  using (is_active);

create policy "transactions: leitura"
  on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "transactions: criação"
  on public.transactions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "transactions: edição"
  on public.transactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "transactions: exclusão"
  on public.transactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Privilégios ------------------------------------------------------------
-- O Supabase concede acesso amplo a anon/authenticated por padrão; aqui o
-- acesso é restringido explicitamente além das políticas de RLS.

revoke all on public.profiles, public.portfolios, public.assets, public.transactions from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, risk_profile) on public.profiles to authenticated;
grant select, insert, delete on public.portfolios to authenticated;
grant update (name, description, risk_profile) on public.portfolios to authenticated;
grant select on public.assets to authenticated;
grant select, insert, delete on public.transactions to authenticated;
grant update (asset_id, type, quantity, price, fees, traded_on, notes) on public.transactions to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Executada pelos triggers com a identidade de quem grava; sob RLS ela enxerga
-- somente as transações do próprio usuário, que são todas as da carteira.
revoke execute on function public.ensure_non_negative_holding(uuid, uuid) from public, anon;
grant execute on function public.ensure_non_negative_holding(uuid, uuid) to authenticated;
