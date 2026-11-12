-- Fase 6: correção da descrição de importados, categorias personalizadas, metas,
-- orçamentos e estado de leitura de alertas.

-- 1. Importados: a descrição original da instituição passa a ser imutável para o usuário.
--    Observações próprias ficam em um campo separado.
alter table public.finance_entries add column note text check (char_length(note) <= 300);

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
    if (new.amount, new.kind, new.occurred_on, new.description) is distinct from (old.amount, old.kind, old.occurred_on, old.description) then
      raise exception 'Lançamentos importados não podem ter valor, tipo, data ou descrição alterados.'
        using errcode = 'check_violation';
    end if;
    new.user_classified := true;
  end if;
  return new;
end;
$$;

grant update (note) on public.finance_entries to authenticated;

-- 2. Categorias: novas predefinidas e personalizadas (custom:<uuid>), sem quebrar lançamentos antigos.
create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.entry_kind not null,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index finance_categories_name_uidx on public.finance_categories (user_id, kind, lower(btrim(name)));
create trigger finance_categories_set_updated_at before update on public.finance_categories for each row execute function public.set_updated_at();

alter table public.finance_entries drop constraint finance_entries_category_check;
alter table public.finance_entries add constraint finance_entries_category_check check (
  category in (
    'salario', 'freelance', 'venda_bens', 'comissoes', 'rendimentos', 'reembolsos',
    'alimentacao', 'transporte', 'moradia', 'saude', 'educacao', 'lazer', 'compras', 'assinaturas', 'outros'
  )
  or category ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Uma categoria personalizada só pode ser usada pelo próprio dono, e uma desativada não recebe novos usos.
create or replace function public.validate_entry_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category like 'custom:%' and (tg_op = 'INSERT' or new.category is distinct from old.category) then
    if not exists (
      select 1 from public.finance_categories c
      where c.id = substring(new.category from 8)::uuid and c.user_id = new.user_id and c.is_active
    ) then
      raise exception 'Categoria inválida.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_entry_category() from public, anon;
grant execute on function public.validate_entry_category() to authenticated, service_role;

create trigger finance_entries_validate_category
  before insert or update of category on public.finance_entries
  for each row execute function public.validate_entry_category();

-- 3. Metas e movimentações da meta (aporte, retirada, valor inicial). O acumulado é calculado.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null check (kind in ('reserva', 'viagem', 'celular', 'carro', 'faculdade', 'investimentos', 'outra')),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index goals_user_idx on public.goals (user_id);
create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();

create table public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null,
  kind text not null check (kind in ('inicial', 'aporte', 'retirada')),
  amount numeric(14, 2) not null check (amount > 0),
  occurred_on date not null check (occurred_on >= date '2000-01-01'),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

create index goal_movements_goal_idx on public.goal_movements (goal_id, occurred_on);

-- Retiradas não podem deixar a meta com saldo negativo.
create or replace function public.ensure_goal_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.goal_id, old.goal_id);
  balance numeric;
begin
  if not exists (select 1 from public.goals where id = target) then
    return null;
  end if;
  select coalesce(sum(case when kind = 'retirada' then -amount else amount end), 0) into balance
  from public.goal_movements where goal_id = target;
  if balance < 0 then
    raise exception 'A retirada é maior que o valor guardado na meta.' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

revoke execute on function public.ensure_goal_balance() from public, anon;
grant execute on function public.ensure_goal_balance() to authenticated, service_role;

create constraint trigger goal_movements_balance
  after insert or update or delete on public.goal_movements
  deferrable initially immediate
  for each row execute function public.ensure_goal_balance();

-- 4. Orçamentos mensais por categoria (limite recorrente; o gasto é calculado dos lançamentos).
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 60),
  monthly_limit numeric(14, 2) not null check (monthly_limit > 0),
  alert_threshold integer not null default 80 check (alert_threshold between 10 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();

-- 5. Alertas são calculados por regras; só o estado de leitura é persistido.
create table public.alert_reads (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alert_key text not null check (char_length(alert_key) between 1 and 200),
  read_at timestamptz not null default now(),
  primary key (user_id, alert_key)
);

alter table public.finance_categories enable row level security;
alter table public.goals enable row level security;
alter table public.goal_movements enable row level security;
alter table public.budgets enable row level security;
alter table public.alert_reads enable row level security;

create policy "finance_categories: dono" on public.finance_categories for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals: dono" on public.goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goal_movements: dono" on public.goal_movements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budgets: dono" on public.budgets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alert_reads: dono" on public.alert_reads for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.finance_categories, public.goals, public.goal_movements, public.budgets, public.alert_reads from anon, authenticated;
grant select on public.finance_categories, public.goals, public.goal_movements, public.budgets, public.alert_reads to authenticated;
grant insert (kind, name) on public.finance_categories to authenticated;
grant update (name, is_active) on public.finance_categories to authenticated;
grant insert (name, kind, target_amount, target_date), update (name, kind, target_amount, target_date), delete on public.goals to authenticated;
grant insert (goal_id, kind, amount, occurred_on, note), delete on public.goal_movements to authenticated;
grant insert (category, monthly_limit, alert_threshold), update (monthly_limit, alert_threshold), delete on public.budgets to authenticated;
grant insert (alert_key), delete on public.alert_reads to authenticated;
