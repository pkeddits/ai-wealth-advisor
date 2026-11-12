-- Teste de metas, orçamentos, categorias personalizadas e alertas.
-- Executa em uma transação e desfaz ao final (rollback): não deixa dados.
-- Sucesso: última consulta retorna "todos os testes passaram".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000002aa', 'ana.plan@teste.invalid', '{"name": "Ana"}'),
  ('00000000-0000-4000-8000-0000000002bb', 'bruno.plan@teste.invalid', '{"name": "Bruno"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002aa", "role": "authenticated"}', true);

do $$
declare
  ok boolean;
  goal uuid;
  cat uuid;
  affected integer;
begin
  insert into public.goals (name, kind, target_amount, target_date) values ('Reserva', 'reserva', 6000, current_date + 365) returning id into goal;
  insert into public.goal_movements (goal_id, kind, amount, occurred_on) values (goal, 'inicial', 1000, current_date - 30), (goal, 'aporte', 500, current_date - 5);
  insert into public.goal_movements (goal_id, kind, amount, occurred_on) values (goal, 'retirada', 300, current_date);
  if (select sum(case when kind = 'retirada' then -amount else amount end) from public.goal_movements where goal_id = goal) <> 1200 then
    raise exception 'FALHA: saldo da meta';
  end if;
  raise notice 'OK: meta com valor inicial, aporte e retirada';

  ok := false;
  begin insert into public.goal_movements (goal_id, kind, amount, occurred_on) values (goal, 'retirada', 5000, current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: retirada acima do guardado aceita'; end if;
  raise notice 'OK: retirada maior que o guardado é recusada';

  ok := false;
  begin insert into public.goals (name, kind, target_amount) values ('Zero', 'outra', 0);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: meta com valor zero aceita'; end if;

  insert into public.budgets (category, monthly_limit) values ('alimentacao', 300);
  ok := false;
  begin insert into public.budgets (category, monthly_limit) values ('alimentacao', 400);
  exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHA: orçamento duplicado para a mesma categoria'; end if;
  raise notice 'OK: orçamento único por categoria e valores inválidos recusados';

  insert into public.finance_categories (kind, name) values ('despesa', 'Pets') returning id into cat;
  insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', 80, 'custom:' || cat, 'Ração', current_date);
  insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('receita', 900, 'freelance', 'Projeto', current_date);
  update public.finance_categories set name = 'Pets e veterinário', is_active = false where id = cat;
  if (select count(*) from public.finance_entries where category = 'custom:' || cat) <> 1 then raise exception 'FALHA: lançamento antigo perdeu a categoria'; end if;
  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', 10, 'custom:' || cat, 'Nova', current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: categoria desativada recebeu novo lançamento'; end if;
  raise notice 'OK: categorias novas e personalizadas; renomear e desativar preservam lançamentos antigos';

  ok := false;
  begin delete from public.finance_categories where id = cat;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: categoria personalizada excluída'; end if;

  insert into public.alert_reads (alert_key) values ('budget:alimentacao:2026-11:over');

  delete from public.goals where id = goal;
  get diagnostics affected = row_count;
  if affected <> 1 or exists (select 1 from public.goal_movements where goal_id = goal) then raise exception 'FALHA: exclusão da meta'; end if;
  raise notice 'OK: excluir a meta remove o histórico dela';
end $$;

reset role;
insert into public.goals (id, user_id, name, kind, target_amount) values ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-0000000002aa', 'Viagem', 'viagem', 4000);
insert into public.finance_categories (id, user_id, kind, name) values ('00000000-0000-4000-8000-00000000ca71', '00000000-0000-4000-8000-0000000002aa', 'despesa', 'Academia');
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002bb", "role": "authenticated"}', true);

do $$
declare
  ok boolean;
  affected integer;
begin
  if (select count(*) from public.goals) + (select count(*) from public.budgets) + (select count(*) from public.finance_categories) + (select count(*) from public.alert_reads) <> 0 then
    raise exception 'FALHA: Bruno vê dados de planejamento da Ana';
  end if;
  update public.goals set target_amount = 1;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno alterou meta da Ana'; end if;

  ok := false;
  begin insert into public.goal_movements (goal_id, kind, amount, occurred_on) values ('00000000-0000-4000-8000-00000000a0a1', 'aporte', 10, current_date);
  exception when foreign_key_violation then ok := true; end;
  if not ok then raise exception 'FALHA: Bruno aportou na meta da Ana'; end if;

  ok := false;
  begin insert into public.finance_entries (kind, amount, category, description, occurred_on) values ('despesa', 10, 'custom:00000000-0000-4000-8000-00000000ca71', 'Usa categoria da Ana', current_date);
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: Bruno usou categoria personalizada da Ana'; end if;

  ok := false;
  begin insert into public.goals (user_id, name, kind, target_amount) values ('00000000-0000-4000-8000-0000000002aa', 'Forjada', 'outra', 10);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: Bruno criou meta em nome da Ana'; end if;
  raise notice 'OK: Bruno não vê, altera nem usa metas e categorias da Ana';
end $$;

reset role;
set local role anon;
do $$
declare ok boolean := false;
begin
  begin perform 1 from public.goals; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: visitante acessa metas'; end if;
  raise notice 'OK: visitante sem login não acessa planejamento';
end $$;

reset role;
select 'todos os testes passaram' as resultado;

rollback;
