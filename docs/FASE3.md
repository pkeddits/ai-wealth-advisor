# Fase 3: carteiras e transações no Supabase

## O que mudou

- `frontend/src/services/supabase/`: carteiras, transações e ativos sobre as tabelas existentes, com o
  mesmo formato dos services da API (verificado com `typeof`). Adaptadores snake_case → camelCase em
  `mappers.ts`; mensagens de erro do banco em `errors.ts`; validação de operações em `trades.ts`.
- `services/index.ts`: no modo `supabase` usa esses services (antes, "indisponível").
- Posições pelo custo médio com `domain/positions.ts`. Não existe fonte de cotações: preço atual, valor
  de mercado e resultado são `null` (tipos atualizados) e a interface mostra "Cotação pendente".
  Distribuição e participação usam o custo investido. Nenhum preço do modo demo é usado.
- Dashboard premium no modo `supabase` (o painel provisório foi removido); estado vazio com
  "Criar primeira carteira".
- Carteira: editar, excluir (com confirmação) e excluir operação. A edição de operações não foi feita.
- `components/system/SessionBoundary.tsx`: descarta os dados financeiros em memória quando o usuário muda.
- Datas de operações exibidas e validadas no fuso local (antes, UTC deslocava um dia).
- Configurações → Integrações mostra apenas conexões que o usuário controlará (contas, cartões, corretoras).

**Banco:** nenhuma migration nova. As duas migrations já aplicadas são suficientes.

## Executar no modo Supabase

Com o `frontend/.env.local` já configurado (`VITE_APP_MODE=supabase`, URL e chave publicável):

```bash
cd frontend
npm ci
npm run dev
```

## Validar no projeto real

1. Entre com a conta A. O painel mostra "Boas-vindas ao seu painel".
2. Crie uma carteira, abra-a e registre: compra de 100 ITUB4 a 30,00 com taxa 5,00 em 01/10/2026 e compra de
   50 ITUB4 a 36,00 em 10/10/2026. Esperado: 150 unidades, preço médio R$ 32,03, custo R$ 4.805,00.
3. Tente vender 200: deve ser recusado. Venda 30 a 40,00 em 15/10/2026: custo passa a R$ 3.844,00.
4. No dashboard, "Capital aplicado" deve mostrar R$ 3.844,00, com "Cotações ainda não integradas".
5. Recarregue a página: os valores permanecem. Em Table Editor → transactions, há 3 linhas da conta A.
6. Saia e entre com a conta B: painel vazio, sem nada da conta A. Abra a URL da carteira da conta A
   (copiada no passo 2): deve aparecer "Carteira não encontrada".
7. Execute novamente `supabase/tests/rls_isolation.sql`: "todos os testes passaram".

## Testes executados nesta fase (ambiente local)

PostgreSQL 16 com as migrations sem alterações, PostgREST 12.2.3 (o mesmo componente da API de dados do
Supabase) e `supabase-js` no navegador; autenticação simulada com JWTs assinados, validados pelo PostgREST e
convertidos em `auth.uid()`. Não substitui a validação acima no projeto real.

- Fluxo completo no navegador (fuso America/Sao_Paulo): 19 passos aprovados.
- Isolamento e integridade pela API REST, sem a interface: 18 verificações aprovadas.
- `rls_isolation.sql`: 13/13. Modo demo: fluxo completo e configurações sem regressão.
- `npm run build`, `npm run check:domain` (19/19). TypeScript: os 5 erros antigos das páginas do modo `api`.

## Pendências

- Fonte de cotações (valor de mercado, resultado, evolução a preço de mercado).
- Edição de operações existentes.
- Open Finance e IA (fases seguintes).
