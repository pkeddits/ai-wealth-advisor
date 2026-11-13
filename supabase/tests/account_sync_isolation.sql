-- Teste da sincronização de conta (Fase 9): preferências, histórico de guias e avatares.
-- Executa em transação com rollback. Sucesso: última consulta retorna "todos os testes passaram".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000005aa', 'ana.sync@teste.invalid', '{"name": "Ana"}'),
  ('00000000-0000-4000-8000-0000000005bb', 'bruno.sync@teste.invalid', '{"name": "Bruno"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005aa", "role": "authenticated"}', true);

do $$
declare ok boolean;
begin
  insert into public.user_settings (preferences) values ('{"aiEnabled": true, "theme": "dark"}')
    on conflict (user_id) do update set preferences = excluded.preferences;
  if not ((select preferences ->> 'aiEnabled' from public.user_settings)::boolean) then raise exception 'FALHA: preferência não salva'; end if;
  raise notice 'OK: Ana salva as próprias preferências';

  perform public.mark_tutorial_seen('dashboard');
  perform public.mark_tutorial_seen('dashboard');
  perform public.mark_tutorial_seen('carteiras');
  if (select tutorials_seen from public.user_settings) <> array['dashboard', 'carteiras'] then raise exception 'FALHA: histórico de guias incorreto'; end if;
  raise notice 'OK: guias vistos acumulam sem duplicar';

  ok := false;
  begin perform public.mark_tutorial_seen('Inválido; drop'); exception when invalid_parameter_value then ok := true; end;
  if not ok then raise exception 'FALHA: identificador de guia não validado'; end if;

  update public.user_settings set tutorials_on_next_login = true;
  if not public.consume_tutorials_on_next_login(array['dashboard', 'carteiras', 'financas']) then raise exception 'FALHA: reapresentação não aplicada'; end if;
  if public.consume_tutorials_on_next_login(array['dashboard']) then raise exception 'FALHA: reapresentação consumida duas vezes'; end if;
  if (select tutorials_on_next_login from public.user_settings) then raise exception 'FALHA: opção continua ativa'; end if;
  if (select tutorials_replay from public.user_settings) <> array['dashboard', 'carteiras', 'financas'] then raise exception 'FALHA: guias pendentes incorretos'; end if;
  perform public.mark_tutorial_seen('carteiras');
  if (select tutorials_replay from public.user_settings) <> array['dashboard', 'financas'] then raise exception 'FALHA: guia visto continua pendente'; end if;
  raise notice 'OK: próximo login é consumido uma única vez e os pendentes saem ao serem vistos';

  perform public.reset_tutorials();
  if cardinality((select tutorials_seen from public.user_settings)) <> 0 then raise exception 'FALHA: recomeçar não limpou'; end if;
  raise notice 'OK: recomeçar todos limpa o histórico da conta';

  ok := false;
  begin update public.user_settings set preferences = '[1, 2]'; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: preferências aceitam valor que não é objeto'; end if;
  ok := false;
  begin update public.user_settings set preferences = jsonb_build_object('x', repeat('a', 20000)); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: preferências sem limite de tamanho'; end if;
  raise notice 'OK: preferências validadas no banco';

  update public.user_settings set avatar_path = '00000000-0000-4000-8000-0000000005aa/avatar-1.webp';
  ok := false;
  begin update public.user_settings set avatar_path = '00000000-0000-4000-8000-0000000005bb/avatar-1.webp'; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: Ana apontou o avatar para a pasta do Bruno'; end if;
  raise notice 'OK: avatar só pode apontar para a própria pasta';

  insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-4000-8000-0000000005aa/avatar-1.webp');
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-4000-8000-0000000005bb/avatar-x.webp');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: Ana enviou arquivo na pasta do Bruno'; end if;
  raise notice 'OK: Ana envia somente na própria pasta';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005bb", "role": "authenticated"}', true);

do $$
declare affected integer;
begin
  if (select count(*) from public.user_settings) <> 0 then raise exception 'FALHA: Bruno vê as preferências da Ana'; end if;
  update public.user_settings set preferences = '{"aiEnabled": false}';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno alterou preferências da Ana'; end if;
  perform public.mark_tutorial_seen('alertas');
  if (select count(*) from public.user_settings) <> 1 then raise exception 'FALHA: Bruno sem a própria linha'; end if;
  if (select tutorials_seen from public.user_settings) <> array['alertas'] then raise exception 'FALHA: histórico do Bruno incorreto'; end if;
  if public.consume_tutorials_on_next_login(array['dashboard']) then raise exception 'FALHA: Bruno consumiu a opção de outra conta'; end if;
  raise notice 'OK: Bruno não vê nem altera as preferências da Ana';

  if (select count(*) from storage.objects where bucket_id = 'avatars') <> 0 then raise exception 'FALHA: Bruno vê o avatar da Ana'; end if;
  delete from storage.objects where bucket_id = 'avatars';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno apagou o avatar da Ana'; end if;
  update storage.objects set name = '00000000-0000-4000-8000-0000000005bb/roubado.webp' where bucket_id = 'avatars';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno moveu o avatar da Ana'; end if;
  raise notice 'OK: Bruno não lê, move nem apaga o avatar da Ana';
end $$;

reset role;

set local role anon;
do $$
declare ok boolean := false;
begin
  begin perform 1 from public.user_settings; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: visitante lê preferências'; end if;
  ok := false;
  begin perform public.mark_tutorial_seen('dashboard'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: visitante executa função da conta'; end if;
  begin
    if (select count(*) from storage.objects) <> 0 then raise exception 'FALHA: visitante vê avatares'; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK: visitante sem login não acessa preferências nem avatares';
end $$;

reset role;
do $$ begin
  if (select avatar_path from public.user_settings where user_id = '00000000-0000-4000-8000-0000000005aa') is distinct from '00000000-0000-4000-8000-0000000005aa/avatar-1.webp' then raise exception 'FALHA: avatar da Ana mudou'; end if;
  if (select public from storage.buckets where id = 'avatars') then raise exception 'FALHA: bucket de avatares público'; end if;
end $$;
select 'todos os testes passaram' as resultado;
rollback;
