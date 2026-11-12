-- Teste de isolamento e integridade dos lançamentos financeiros.
-- Executa em uma transação e desfaz ao final (rollback): não deixa dados.
-- Sucesso: última consulta retorna "todos os testes passaram".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000fa', 'ana.fin@teste.invalid', '{"name": "Ana"}'),
  ('00000000-0000-4000-8000-0000000000fb', 'bruno.fin@teste.invalid', '{"name": "Bruno"}');

-- Lançamento importado simulado (no futuro, inserido pelo servidor com service role).
insert into public.finance_entries (user_id, kind, amount, category, description, occurred_on, source, external_id) values
  ('00000000-0000-4000-8000-0000000000fa', 'despesa', 89.90, 'alimentacao', 'Mercado (importado)', current_date - 3, 'open_finance', 'ext-001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000fa", "role": "authenticated"}', true);

insert into public.finance_entries (kind, amount, category, description, occurred_on) values
  ('receita', 3500, 'salario', 'Salário', current_date - 10),
  ('despesa', 1200.50, 'moradia', 'Aluguel', current_date - 5);

do $$
declare
  ok boolean;
  affected integer;
begin
  if (select count(*) from public.finance_entries) <> 3 then raise exception 'FALHA: Ana não vê os próprios lançamentos'; end if;
  if (select user_id from public.finance_entries where description = 'Aluguel') <> '00000000-0000-4000-8000-0000000000fa' then
    raise exception 'FALHA: user_id não veio de auth.uid()';
  end if;
  raise notice 'OK: Ana cria e lê os próprios lançamentos';

  update public.finance_entries set amount = 1250, description = 'Aluguel e condomínio' where description = 'Aluguel';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FALHA: Ana não edita o próprio lançamento'; end if;
  raise notice 'OK: Ana edita lançamento manual';

  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', 0, 'lazer', 'Zero', current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: valor zero aceito'; end if;

  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', -10, 'lazer', 'Negativo', current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: valor negativo aceito'; end if;

  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', 10, 'cassino', 'Categoria inválida', current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: categoria inválida aceita'; end if;

  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', 10, 'lazer', '   ', current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: descrição vazia aceita'; end if;
  raise notice 'OK: valores, categorias e descrições inválidos são recusados';

  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on, source, external_id) values ('receita', 999999, 'salario', 'Forjado', current_date, 'open_finance', 'fake-1');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: usuário criou lançamento como importado'; end if;
  raise notice 'OK: usuário não cria lançamento como se fosse importado';

  ok := false;
  begin update public.finance_entries set amount = 1 where source = 'open_finance';
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: valor de lançamento importado alterado'; end if;
  update public.finance_entries set category = 'outros' where source = 'open_finance';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FALHA: não é possível recategorizar lançamento importado'; end if;
  raise notice 'OK: lançamento importado só pode ser recategorizado';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000fb", "role": "authenticated"}', true);

do $$
declare
  ok boolean;
  affected integer;
begin
  if (select count(*) from public.finance_entries) <> 0 then raise exception 'FALHA: Bruno vê lançamentos da Ana'; end if;
  update public.finance_entries set amount = 1;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno alterou lançamentos da Ana'; end if;
  delete from public.finance_entries;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno excluiu lançamentos da Ana'; end if;
  raise notice 'OK: Bruno não lê, altera nem exclui lançamentos da Ana';
end $$;

reset role;
set local role anon;
do $$
declare ok boolean := false;
begin
  begin perform 1 from public.finance_entries; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: visitante sem login acessa lançamentos'; end if;
  raise notice 'OK: visitante sem login não acessa lançamentos';
end $$;

reset role;
do $$
begin
  if (select count(*) from public.finance_entries where user_id = '00000000-0000-4000-8000-0000000000fa') <> 3 then
    raise exception 'FALHA: lançamentos da Ana foram alterados por outro usuário';
  end if;
end $$;
select 'todos os testes passaram' as resultado;

rollback;
