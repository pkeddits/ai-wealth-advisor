-- Fase 8.1: preferências da conta que precisam valer entre dispositivos e sessões.
-- tutorials_on_next_login: reapresenta os guias no próximo login; o app desativa ao aplicar.

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  tutorials_on_next_login boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "user_settings: dono" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;
grant insert (tutorials_on_next_login), update (tutorials_on_next_login) on public.user_settings to authenticated;
