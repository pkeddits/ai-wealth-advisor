-- Teste de isolamento e proteção dos dados importados por Open Finance.
-- Executa em uma transação e desfaz ao final (rollback): não deixa dados.
-- Sucesso: última consulta retorna "todos os testes passaram".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000001aa', 'ana.of@teste.invalid', '{"name": "Ana"}'),
  ('00000000-0000-4000-8000-0000000001bb', 'bruno.of@teste.invalid', '{"name": "Bruno"}');

-- Dados gravados como o servidor faria (service role).
insert into public.bank_connections (id, user_id, item_id, institution_name, status) values
  ('00000000-0000-4000-8000-00000000c0aa', '00000000-0000-4000-8000-0000000001aa', 'item-ana', 'Banco Teste', 'UPDATED');
insert into public.bank_accounts (id, user_id, connection_id, external_id, kind, name, balance) values
  ('00000000-0000-4000-8000-00000000acaa', '00000000-0000-4000-8000-0000000001aa', '00000000-0000-4000-8000-00000000c0aa', 'acc-1', 'BANK', 'Conta corrente', 1500.00);
insert into public.finance_entries (user_id, kind, amount, category, description, occurred_on, source, external_id, account_id, needs_review) values
  ('00000000-0000-4000-8000-0000000001aa', 'despesa', 120.00, 'outros', 'PIX ENVIADO', current_date - 2, 'open_finance', 'tx-1', '00000000-0000-4000-8000-00000000acaa', true);
insert into public.investment_positions (user_id, connection_id, external_id, name, type, balance) values
  ('00000000-0000-4000-8000-0000000001aa', '00000000-0000-4000-8000-00000000c0aa', 'inv-1', 'CDB Banco Teste', 'FIXED_INCOME', 2000.00);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001aa", "role": "authenticated"}', true);

do $$
declare
  ok boolean;
  affected integer;
begin
  if (select count(*) from public.bank_connections) <> 1 or (select count(*) from public.bank_accounts) <> 1
     or (select count(*) from public.investment_positions) <> 1 then
    raise exception 'FALHA: Ana não lê os próprios dados importados';
  end if;
  raise notice 'OK: Ana lê conexões, contas e investimentos próprios';

  update public.finance_entries set category = 'moradia', flow = 'transfer', needs_review = false where external_id = 'tx-1';
  if (select user_classified from public.finance_entries where external_id = 'tx-1') is not true then
    raise exception 'FALHA: reclassificação não foi marcada como decisão do usuário';
  end if;
  raise notice 'OK: Ana reclassifica a transação importada e a escolha fica registrada';

  ok := false;
  begin update public.finance_entries set amount = 1 where external_id = 'tx-1';
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: valor de transação importada alterado'; end if;

  ok := false;
  begin update public.finance_entries set occurred_on = current_date - 30 where external_id = 'tx-1';
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHA: data de transação importada alterada'; end if;

  if exists (select 1 from information_schema.columns where table_name = 'finance_entries' and column_name = 'note') then
    ok := false;
    begin update public.finance_entries set description = 'Descrição editada' where external_id = 'tx-1';
    exception when check_violation then ok := true; end;
    if not ok then raise exception 'FALHA: descrição original de transação importada alterada'; end if;
    execute $q$update public.finance_entries set note = 'Aluguel de outubro' where external_id = 'tx-1'$q$;
    raise notice 'OK: descrição original preservada; anotação própria permitida';
  end if;

  ok := false;
  begin update public.finance_entries set external_id = 'outro' where external_id = 'tx-1';
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: identificador externo alterado'; end if;

  ok := false;
  begin update public.finance_entries set account_id = null where external_id = 'tx-1';
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: conta de origem alterada'; end if;
  raise notice 'OK: valor, data, identificador e conta de origem são imutáveis para o usuário';

  delete from public.finance_entries where external_id = 'tx-1';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: usuário excluiu transação importada'; end if;
  raise notice 'OK: transação importada não pode ser excluída pelo usuário';

  ok := false;
  begin insert into public.bank_connections (user_id, item_id, institution_name, status) values ('00000000-0000-4000-8000-0000000001aa', 'falso', 'Banco Falso', 'UPDATED');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: usuário criou conexão bancária pelo cliente'; end if;

  ok := false;
  begin update public.bank_accounts set balance = 999999;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: usuário alterou saldo importado'; end if;

  ok := false;
  begin insert into public.investment_positions (user_id, connection_id, external_id, name, type) values ('00000000-0000-4000-8000-0000000001aa', '00000000-0000-4000-8000-00000000c0aa', 'x', 'Forjado', 'EQUITY');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: usuário criou investimento importado'; end if;

  ok := false;
  begin delete from public.bank_connections;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: usuário excluiu conexão direto pelo cliente'; end if;
  raise notice 'OK: conexões, saldos e investimentos não podem ser forjados nem alterados pelo cliente';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001bb", "role": "authenticated"}', true);

do $$
declare affected integer;
begin
  if (select count(*) from public.bank_connections) + (select count(*) from public.bank_accounts)
     + (select count(*) from public.investment_positions) + (select count(*) from public.finance_entries) <> 0 then
    raise exception 'FALHA: Bruno vê dados importados da Ana';
  end if;
  update public.finance_entries set category = 'lazer';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno reclassificou transação da Ana'; end if;
  raise notice 'OK: Bruno não vê nem altera dados importados da Ana';
end $$;

reset role;
set local role anon;
do $$
declare ok boolean := false;
begin
  begin perform 1 from public.bank_accounts; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHA: visitante sem login acessa contas'; end if;
  raise notice 'OK: visitante sem login não acessa dados bancários';
end $$;

reset role;
do $$
begin
  if (select amount from public.finance_entries where external_id = 'tx-1') <> 120.00 then raise exception 'FALHA: valor original perdido'; end if;
  if (select count(*) from public.finance_entries where external_id = 'tx-1') <> 1 then raise exception 'FALHA: transação importada removida'; end if;
end $$;
select 'todos os testes passaram' as resultado;

rollback;
