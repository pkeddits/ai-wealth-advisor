-- Teste de isolamento entre usuários e regras de integridade.
-- Executa tudo em uma transação e desfaz ao final (rollback): não deixa dados.
-- Sucesso: última consulta retorna "todos os testes passaram".
-- Falha: a execução para com uma mensagem iniciada por "FALHA".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'ana.rls@teste.invalid', '{"name": "Ana", "risk_profile": "arrojado"}'),
  ('00000000-0000-4000-8000-00000000000b', 'bruno.rls@teste.invalid', '{"name": "Bruno", "risk_profile": "invalido"}');

do $$
begin
  if (select full_name || '/' || risk_profile from public.profiles where id = '00000000-0000-4000-8000-00000000000a') <> 'Ana/arrojado'
     or (select risk_profile::text from public.profiles where id = '00000000-0000-4000-8000-00000000000b') <> 'moderado' then
    raise exception 'FALHA: perfis não foram criados corretamente pelo cadastro';
  end if;
  raise notice 'OK: perfil criado no cadastro (perfil de risco inválido vira moderado)';
end $$;

-- Ana -------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

insert into public.portfolios (id, name, description) values
  ('00000000-0000-4000-8000-0000000000a1', 'Carteira da Ana', 'Longo prazo');

insert into public.transactions (portfolio_id, asset_id, type, quantity, price, fees, traded_on)
select '00000000-0000-4000-8000-0000000000a1', id, 'compra', 10, 30.50, 1.20, current_date - 10
from public.assets where symbol = 'ITUB4';

insert into public.transactions (portfolio_id, asset_id, type, quantity, price, traded_on)
select '00000000-0000-4000-8000-0000000000a1', id, 'venda', 4, 33, current_date - 5
from public.assets where symbol = 'ITUB4';

do $$
declare
  ok boolean;
begin
  if (select count(*) from public.portfolios) <> 1 or (select count(*) from public.transactions) <> 2 then
    raise exception 'FALHA: Ana não vê os próprios registros';
  end if;
  if (select user_id from public.portfolios) <> '00000000-0000-4000-8000-00000000000a' then
    raise exception 'FALHA: user_id não foi preenchido com auth.uid()';
  end if;
  if (select count(*) from public.assets) < 9 then
    raise exception 'FALHA: catálogo de ativos não está legível';
  end if;
  raise notice 'OK: Ana cria e lê carteira e transações; user_id vem de auth.uid()';

  ok := false;
  begin
    insert into public.transactions (portfolio_id, asset_id, type, quantity, price, traded_on)
    select '00000000-0000-4000-8000-0000000000a1', id, 'venda', 7, 33, current_date
    from public.assets where symbol = 'ITUB4';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'FALHA: venda acima do saldo foi aceita'; end if;
  raise notice 'OK: venda acima do saldo (7 de 6) é recusada';

  ok := false;
  begin
    delete from public.transactions where type = 'compra';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'FALHA: exclusão da compra que sustenta a venda foi aceita'; end if;
  raise notice 'OK: excluir a compra que sustenta uma venda é recusado';

  ok := false;
  begin
    insert into public.transactions (portfolio_id, asset_id, type, quantity, price, traded_on)
    select '00000000-0000-4000-8000-0000000000a1', id, 'compra', 1, 10, current_date + 1
    from public.assets where symbol = 'PETR4';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'FALHA: operação com data futura foi aceita'; end if;
  raise notice 'OK: data futura é recusada';

  ok := false;
  begin
    insert into public.transactions (portfolio_id, asset_id, type, quantity, price, traded_on)
    select '00000000-0000-4000-8000-0000000000a1', id, 'compra', 0, 10, current_date
    from public.assets where symbol = 'PETR4';
  exception when check_violation then ok := true;
  end;
  if not ok then raise exception 'FALHA: quantidade zero foi aceita'; end if;

  ok := false;
  begin
    insert into public.assets (symbol, name, asset_class) values ('FAKE3', 'Ativo indevido', 'acoes');
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FALHA: usuário comum conseguiu cadastrar ativo'; end if;
  raise notice 'OK: usuário comum não altera o catálogo de ativos';

  ok := false;
  begin
    update public.portfolios set user_id = '00000000-0000-4000-8000-00000000000b';
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FALHA: Ana transferiu a carteira para outro usuário'; end if;
  raise notice 'OK: não é possível transferir a carteira para outro usuário';
end $$;

-- Bruno -----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

do $$
declare
  ok boolean;
  affected integer;
begin
  if (select count(*) from public.portfolios) <> 0 then raise exception 'FALHA: Bruno vê carteiras da Ana'; end if;
  if (select count(*) from public.transactions) <> 0 then raise exception 'FALHA: Bruno vê transações da Ana'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FALHA: Bruno vê perfis de outros usuários'; end if;
  raise notice 'OK: Bruno não vê carteiras, transações nem perfil da Ana';

  update public.portfolios set name = 'Invadida' where id = '00000000-0000-4000-8000-0000000000a1';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno alterou a carteira da Ana'; end if;

  delete from public.portfolios where id = '00000000-0000-4000-8000-0000000000a1';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno excluiu a carteira da Ana'; end if;

  update public.profiles set full_name = 'Invadido' where id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALHA: Bruno alterou o perfil da Ana'; end if;
  raise notice 'OK: Bruno não altera nem exclui dados da Ana';

  ok := false;
  begin
    insert into public.transactions (portfolio_id, asset_id, type, quantity, price, traded_on)
    select '00000000-0000-4000-8000-0000000000a1', id, 'compra', 1, 10, current_date
    from public.assets where symbol = 'PETR4';
  exception when foreign_key_violation then ok := true;
  end;
  if not ok then raise exception 'FALHA: Bruno lançou transação na carteira da Ana'; end if;

  ok := false;
  begin
    insert into public.transactions (portfolio_id, user_id, asset_id, type, quantity, price, traded_on)
    select '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', id, 'compra', 1, 10, current_date
    from public.assets where symbol = 'PETR4';
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FALHA: Bruno lançou transação usando o user_id da Ana'; end if;

  ok := false;
  begin
    insert into public.portfolios (name, user_id) values ('Falsa', '00000000-0000-4000-8000-00000000000a');
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FALHA: Bruno criou carteira em nome da Ana'; end if;
  raise notice 'OK: Bruno não grava dados usando ids da Ana (carteira ou user_id forjados)';

  update public.profiles set risk_profile = 'conservador';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FALHA: Bruno não consegue editar o próprio perfil'; end if;
  raise notice 'OK: Bruno edita o próprio perfil';
end $$;

-- Visitante sem login (anon) --------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
declare
  ok boolean := false;
begin
  begin
    perform 1 from public.portfolios;
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then raise exception 'FALHA: visitante sem login acessa carteiras'; end if;
  raise notice 'OK: visitante sem login não acessa tabelas privadas';
end $$;

-- Exclusão em cascata ---------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
begin
  delete from public.portfolios where id = '00000000-0000-4000-8000-0000000000a1';
  if (select count(*) from public.transactions) <> 0 then
    raise exception 'FALHA: transações não foram removidas com a carteira';
  end if;
  raise notice 'OK: excluir a carteira remove as transações dela';
end $$;

reset role;
select 'todos os testes passaram' as resultado;

rollback;
