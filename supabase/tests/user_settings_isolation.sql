-- Teste das preferências da conta. Executa em transação com rollback.
-- Sucesso: última consulta retorna "todos os testes passaram".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000004aa', 'ana.pref@teste.invalid', '{"name": "Ana"}'),
  ('00000000-0000-4000-8000-0000000004bb', 'bruno.pref@teste.invalid', '{"name": "Bruno"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004aa", "role": "authenticated"}', true);

do $$
declare ok boolean;
begin
  insert into public.user_settings (tutorials_on_next_login) values (true)
    on conflict (user_id) do update set tutorials_on_next_login = excluded.tutorials_on_next_login;
  if not (select tutorials_on_next_login from public.user_settings) then raise exception 'FALHA: opção não salva'; end if;
  update public.user_settings set tutorials_on_next_login = false;
  if (select tutorials_on_next_login from public.user_settings) then raise exception 'FALHA: opção não desativada'; end if;
  update public.user_settings set tutorials_on_next_login = true;
  raise notice 'OK: Ana ativa e desativa a própria opção';

  ok := false;
  begin insert into public.user_settings (user_id, tutorials_on_next_login) values ('00000000-0000-4000-8000-0000000004bb', true);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: Ana criou preferência em nome do Bruno'; end if;
  raise notice 'OK: Ana não grava preferências de outra conta';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004bb", "role": "authenticated"}', true);

do $$
declare affected integer;
begin
  if (select count(*) from public.user_settings) <> 0 then raise exception 'FALHA: Bruno vê a opção da Ana'; end if;
  update public.user_settings set tutorials_on_next_login = false;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno alterou a opção da Ana'; end if;
  insert into public.user_settings (tutorials_on_next_login) values (false);
  if (select count(*) from public.user_settings) <> 1 then raise exception 'FALHA: Bruno sem a própria linha'; end if;
  raise notice 'OK: Bruno não vê nem altera a opção da Ana e tem a própria';
end $$;

reset role;

set local role anon;
do $$
declare ok boolean := false;
begin
  begin perform 1 from public.user_settings; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: visitante lê preferências'; end if;
  raise notice 'OK: visitante sem login não acessa preferências';
end $$;

reset role;
do $$ begin
  if not (select tutorials_on_next_login from public.user_settings where user_id = '00000000-0000-4000-8000-0000000004aa') then raise exception 'FALHA: opção da Ana mudou'; end if;
end $$;
select 'todos os testes passaram' as resultado;
rollback;
