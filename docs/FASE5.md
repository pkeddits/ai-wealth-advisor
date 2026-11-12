# Fase 5: Open Finance com a Pluggy

## O que foi implementado

- **Conexão:** Configurações → Integrações → "Conectar banco" abre o widget oficial (`react-pluggy-connect`).
  O Connect Token é gerado no servidor com `options.clientUserId` = id do usuário autenticado e
  `avoidDuplicates`. Depois do `onSuccess`, o servidor consulta o Item na Pluggy e só o vincula se o
  `clientUserId` for o do usuário logado. Reconectar usa `updateItem` (mesmo Item, sem duplicar dados).
- **Importação** (`POST /api/pluggy/sync`): contas (`GET /accounts`), transações de cada conta com
  paginação por cursor (`GET /v2/transactions`, seguindo `next` até o fim), investimentos
  (`GET /investments`) e operações de investimento (`GET /investments/{id}/transactions`).
- **Classificação conservadora** (`server/pluggy/normalize.ts`): transferência entre contas do mesmo
  titular, aplicação/resgate e pagamento de fatura (com cartão conectado) ficam fora dos totais; estorno
  abate a despesa; pendentes não contam; Pix/TED a terceiros sem categoria clara ficam "Revisar".
- **Finanças pessoais:** importados aparecem com a instituição de origem, selos (Pendente, Transferência,
  Investimento, Fatura, Estorno, Revisar) e filtro "A revisar". Em importados, o usuário corrige
  categoria e natureza; valor, data, conta e identificador são imutáveis, e a escolha é preservada nas
  sincronizações. Importados não podem ser excluídos (voltariam na próxima sincronização).
- **Investimentos importados:** seção separada em Carteiras (não somada às carteiras manuais). Mostra o
  valor informado e a data; aplicado e diferença só quando a instituição informa o valor aplicado.
- **Dashboard:** saldo em contas e investimentos importados, ou atalho para conectar.
- **Ocultar valores:** botão de olho no cabeçalho.
- **Landing:** nova seção de Finanças Pessoais (dados ilustrativos, "Open Finance em fase de testes").

## Banco de dados

Migration nova: `supabase/migrations/20261113090000_open_finance.sql`.
Tabelas `bank_connections`, `bank_accounts`, `investment_positions`, `investment_movements` (somente leitura
para o usuário) e novas colunas em `finance_entries`. Nenhum CPF ou número completo de conta é guardado
(apenas os 4 últimos dígitos).

1. SQL Editor → execute `20261113090000_open_finance.sql`.
2. Execute `supabase/tests/open_finance_isolation.sql` → "todos os testes passaram".
3. Execute de novo `finance_isolation.sql` (atualizado nesta fase) e `rls_isolation.sql`.

## Configurar a Pluggy

1. Crie a conta em https://dashboard.pluggy.ai e crie uma aplicação.
2. Na aplicação, copie **Client ID** e **Client Secret**.
3. O conector de testes **Pluggy Bank** está disponível no ambiente da aplicação. O teste com instituições
   reais segue o período de avaliação informado no painel e em https://www.pluggy.ai/precos.
4. No Supabase: Project Settings → API Keys → crie/copie uma **secret key** (`sb_secret_...`).

## Variáveis de ambiente

`frontend/.env.local` (local) e Vercel → Settings → Environment Variables:

```
PLUGGY_CLIENT_ID=...
PLUGGY_CLIENT_SECRET=...
SUPABASE_SECRET_KEY=sb_secret_...
VITE_PLUGGY_INCLUDE_SANDBOX=true
```

As três primeiras não têm prefixo `VITE_`: ficam no servidor e não entram no JavaScript do navegador.
Sem elas, a aplicação continua funcionando e Integrações informa que a conexão não está configurada.

## Executar no VS Code

```bash
cd frontend
npm ci
npm run dev
```

O `npm run dev` atende `/api/quotes` e `/api/pluggy/*` com o mesmo código das funções da Vercel
(`frontend/api`). Na Vercel, `vercel.json` define 60 s de duração para as funções da Pluggy.

URLs de redirecionamento: o widget web abre o fluxo da instituição em janela própria; nenhuma URL
precisa ser cadastrada para o Sandbox. Se uma instituição exigir retorno por OAuth no seu domínio,
configure o `oauthRedirectUri` conforme a documentação da Pluggy (não usado nesta fase).

## Roteiro de validação

**Sandbox**
1. Entre com a conta A → Configurações → Integrações → Conectar banco.
2. Escolha "Pluggy Bank", usuário `user-ok`, senha `password-ok` (MFA, se pedido: `123456`).
3. Ao concluir, a sincronização inicial roda sozinha. Esperado: conta corrente e cartão listados com os
   4 últimos dígitos, "Dados disponíveis" com contas, movimentações e investimentos.
4. Finanças pessoais: movimentações com origem "Pluggy Bank"; o salário entra em receitas; pagamento de
   fatura fora dos totais. Os dados do Sandbox mudam semanalmente; confira a regra, não valores fixos.
5. Classifique uma movimentação, clique "Sincronizar agora" (após 30 s): a classificação permanece e
   nenhum lançamento é duplicado (Table Editor → `finance_entries`, filtro `source = open_finance`).
6. Carteiras → Investimentos importados: posições do Sandbox; itens sem valor aplicado mostram "não informado".
7. Usuário `user-error` ou `user-locked` no widget: a conexão falha com mensagem, sem quebrar a aplicação.
8. Conta B: Integrações vazia, nenhuma movimentação da conta A.
9. Desvincular: confirma, remove os importados e mantém os lançamentos manuais.

**Conta real (período de teste)**: repita os passos 1 a 6 escolhendo sua instituição no widget, com
`VITE_PLUGGY_INCLUDE_SANDBOX=false`. A autorização acontece no ambiente da instituição. Nem todas
compartilham investimentos, e os dados podem levar alguns minutos (status "Atualizando").

**Diagnóstico sem expor dados**: as funções não registram tokens nem dados financeiros. Use a mensagem
mostrada em Integrações e o status da conexão; nos logs da Vercel aparecem apenas os códigos HTTP.

## Testes executados nesta fase

Ambiente local, **sem acesso à rede da Pluggy** (api.pluggy.ai bloqueada aqui): respostas simuladas no
formato da documentação oficial; banco, RLS e triggers reais (PostgreSQL 16 + PostgREST 12).

- `npm run check:openfinance`: 23 (classificação, datas UTC−3, totais com estorno/fatura/transferência).
- Handlers + banco real: 35 (propriedade do Item, Connect Token, paginação, deduplicação, preservação da
  classificação, trava, intervalo mínimo, erro da API, desconexão, ausência de segredos nas respostas).
- Navegador (modo supabase): integrações, finanças com origem e reclassificação, dashboard, investimentos
  importados, ocultar valores, isolamento entre dois usuários.
- SQL: `open_finance_isolation.sql`, `finance_isolation.sql`, `rls_isolation.sql`.
- Regressões: Fases 3 e 4 (navegador e API REST), modo demo, movimento reduzido.

**Não testado aqui**: o widget real, o Sandbox real da Pluggy e conexão com banco real.

## Limitações conhecidas

- Sincronização explícita; webhooks não implementados (eventos `transactions/deleted` não são aplicados).
- Conectar a mesma conta como um novo Item gera novos ids de transação; a reconexão pelo botão
  "Reconectar" evita isso, e `avoidDuplicates` impede novo Item com as mesmas credenciais.
- Sem conciliação automática entre investimentos importados e carteiras manuais.
