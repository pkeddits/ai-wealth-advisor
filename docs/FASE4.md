# Fase 4: cotações e finanças pessoais

## Cotações (brapi.dev)

- `frontend/server/quotes.ts`: consulta a API v2 (`/api/v2/stocks/quote`) no servidor, um ativo por vez e
  em sequência (plano gratuito: 1 ativo por requisição, 1 requisição simultânea, 15 mil/mês, dados a cada
  30 min). Cache de 15 min, atualização forçada só após 60 s, respeita `Retry-After` em 429, exige sessão
  válida do Supabase. Cada ativo responde com preço ou com o motivo da ausência.
- `frontend/api/quotes.ts`: função da Vercel (`GET /api/quotes?symbols=ITUB4,PETR4`).
- `vite.config.ts`: no `npm run dev`, o mesmo handler atende `/api/quotes`. Não precisa de Vercel CLI.
- `frontend/src/services/quotes.ts`: cliente com cache de 10 min no navegador e atualização manual.
- Cálculos: valor de mercado = quantidade × última cotação; ganho não realizado = valor de mercado − custo;
  resultado realizado das vendas pelo custo médio (`computeRealized`). O patrimônio a mercado só aparece
  quando todas as posições têm cotação; caso contrário, mostra o capital aplicado e quantos ativos estão
  pendentes. O gráfico continua sendo do capital aplicado: o histórico gratuito (3 meses) não permite
  reconstruir a evolução a mercado de forma confiável.

### Executar localmente

`frontend/.env.local` (já existente) + opcionalmente `BRAPI_API_KEY=` (sem prefixo `VITE_`):

```bash
cd frontend && npm ci && npm run dev
```

Com uma posição em ITUB4, o dashboard e a carteira mostram preço, horário e ganho. Sem chave, ativos fora de
PETR4, VALE3, MGLU3 e ITUB4 aparecem como "Cotação pendente".

### Vercel

Nas variáveis do projeto, mantenha `VITE_APP_MODE`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
(a função também as usa para validar a sessão) e, se tiver, `BRAPI_API_KEY`. O `vercel.json` não reescreve
`/api/` para o `index.html`.

## Finanças pessoais

- Migration nova: `supabase/migrations/20261112090000_personal_finance.sql` (tabela `finance_entries`,
  RLS, valores `numeric(14,2)` positivos, categorias fixas, `source` + `external_id` com índice único para
  a importação futura sem duplicar). Usuários só criam lançamentos `manual`.
- Página `/financas`: saldo do período (receitas − despesas, não é saldo bancário), receitas, despesas,
  despesas por categoria, movimentação diária, filtros, navegação por mês, criar, editar e excluir.

### Aplicar a migration no Supabase

1. SQL Editor → execute o conteúdo de `20261112090000_personal_finance.sql` (as duas anteriores já estão aplicadas).
2. Execute `supabase/tests/finance_isolation.sql`: deve retornar "todos os testes passaram" (usa rollback).
3. Execute de novo `supabase/tests/rls_isolation.sql` para confirmar que nada mudou nas carteiras.

## Roteiro de validação no projeto real

1. Carteira com: compra 100 ITUB4 a 30,00 (taxa 5,00) em 01/10/2026, compra 50 a 36,00 em 10/10/2026, venda
   30 a 40,00 em 15/10/2026. Esperado: 120 unidades, custo R$ 3.844,00, **resultado realizado +R$ 239,00**.
2. ITUB4 deve mostrar preço atual e horário. Valor de mercado = 120 × preço; ganho = valor − R$ 3.844,00.
3. Compre 1 SELIC29: ele fica "Cotação pendente", e o dashboard volta a mostrar "Capital aplicado" com
   "Cotação pendente para 1 ativo".
4. Recarregue a página: sem nova consulta à brapi por 10 minutos (aba Rede do navegador: nenhuma chamada a
   `/api/quotes`).
5. Em Finanças pessoais: receita de 3.500,00 (Salário), despesas de 1.200,50 (Moradia) e 89,90 (Alimentação)
   no mês atual. Esperado: saldo R$ 2.209,60. Edite 89,90 para 99,90 → R$ 2.199,60. Exclua o aluguel → R$ 3.400,10.
6. Lance uma despesa em outro mês: a página muda para esse mês; o mês atual não é afetado.
7. Com a conta B, Finanças pessoais deve estar vazia.

## Testes executados (ambiente local, não no seu Supabase)

- `npm run check:domain` (30) e `npm run check:quotes` (31, respostas simuladas da brapi no formato documentado).
- SQL: `rls_isolation.sql` 13/13 e `finance_isolation.sql` aprovados em PostgreSQL 16 com as três migrations.
- Navegador + PostgREST 12 + handler real de cotações (JWT verificado; brapi simulada): fluxo de cotações,
  cache, falha do serviço, finanças completas e isolamento entre usuários.
- API REST sem a interface: 18/18 (carteiras) e 13/13 (finanças).
- `npm run dev`: `/api/quotes` respondido pelo handler (401 sem sessão).
- Modo demo: carteiras, configurações, finanças fictícias e movimento reduzido sem regressão.

A brapi real não foi chamada daqui (rede bloqueada): confirme no seu ambiente com o passo 2.
