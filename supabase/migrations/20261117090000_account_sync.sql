-- Fase 9: preferências que acompanham a conta em qualquer dispositivo.
-- Estende user_settings (Fase 8.1) sem alterar dados existentes e cria o bucket privado de avatares.

alter table public.user_settings
  add column preferences jsonb not null default '{}'::jsonb,
  add column tutorials_seen text[] not null default '{}',
  add column tutorials_replay text[] not null default '{}',
  add column avatar_path text,
  add column avatar_updated_at timestamptz;

alter table public.user_settings
  add constraint user_settings_preferences_object check (jsonb_typeof(preferences) = 'object'),
  add constraint user_settings_preferences_size check (pg_column_size(preferences) <= 8192),
  add constraint user_settings_tutorials_size check (cardinality(tutorials_seen) <= 32 and cardinality(tutorials_replay) <= 32),
  add constraint user_settings_avatar_owner check (
    avatar_path is null or (avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$' and split_part(avatar_path, '/', 1) = user_id::text)
  );

grant insert (preferences, avatar_path, avatar_updated_at), update (preferences, avatar_path, avatar_updated_at) on public.user_settings to authenticated;
grant update (tutorials_seen, tutorials_replay) on public.user_settings to authenticated;

-- Marca um guia como visto (união, sem sobrescrever o que outro dispositivo gravou) e o retira da reapresentação.
create function public.mark_tutorial_seen(p_id text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_id is null or p_id !~ '^[a-z]{2,32}$' then
    raise exception 'guia inválido' using errcode = '22023';
  end if;
  insert into public.user_settings (tutorials_on_next_login) values (false) on conflict (user_id) do nothing;
  update public.user_settings
     set tutorials_seen = case when p_id = any (tutorials_seen) then tutorials_seen else tutorials_seen || p_id end,
         tutorials_replay = array_remove(tutorials_replay, p_id)
   where user_id = (select auth.uid());
end;
$$;

-- "Recomeçar todos os guias": vale para todos os dispositivos da conta.
create function public.reset_tutorials()
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.user_settings (tutorials_on_next_login) values (false) on conflict (user_id) do nothing;
  update public.user_settings set tutorials_seen = '{}', tutorials_replay = '{}' where user_id = (select auth.uid());
$$;

-- Aplica a opção "Mostrar tutoriais no próximo login" de forma atômica: só um login a consome.
create function public.consume_tutorials_on_next_login(p_ids text[])
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare applied boolean;
begin
  if p_ids is null or cardinality(p_ids) > 32 or exists (select 1 from unnest(p_ids) as t(id) where id !~ '^[a-z]{2,32}$') then
    raise exception 'lista de guias inválida' using errcode = '22023';
  end if;
  update public.user_settings
     set tutorials_on_next_login = false, tutorials_replay = p_ids
   where user_id = (select auth.uid()) and tutorials_on_next_login
  returning true into applied;
  return coalesce(applied, false);
end;
$$;

revoke all on function public.mark_tutorial_seen(text), public.reset_tutorials(), public.consume_tutorials_on_next_login(text[]) from public, anon;
grant execute on function public.mark_tutorial_seen(text), public.reset_tutorials(), public.consume_tutorials_on_next_login(text[]) to authenticated;

-- Avatares: bucket privado, até 1 MB, somente imagens. Cada conta lê e grava apenas a própria pasta (<user_id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono substitui" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono remove" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
