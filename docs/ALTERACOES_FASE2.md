# Fase 2, primeira rodada (11/11/2026)

Branch `fase-2`. Backend Go sem alterações. Modo demonstração preservado.

## Banco de dados (Supabase PostgreSQL)

- `supabase/migrations/20261111120000_core_schema.sql`: `profiles`, `portfolios`, `assets`,
  `transactions`; valores em `numeric`; RLS em todas as tabelas; grants restritos por coluna;
  `anon` sem acesso; FK composta `(portfolio_id, user_id)` impede transação em carteira alheia;
  trigger recusa venda acima do saldo e data futura; perfil criado no cadastro.
- `supabase/migrations/20261111120100_seed_assets.sql`: catálogo de 9 ativos, sem preços.
- `supabase/tests/rls_isolation.sql`: 13 verificações, em transação com rollback.

## Autenticação

- `services/session/`: contrato de sessão com implementações demo, Supabase e API Go.
- `store/authStore.tsx` reescrito sobre o contrato, com a mesma API para as páginas.
- `VITE_APP_MODE` = `demo` | `supabase` | `api`; `VITE_DEMO_MODE=false` continua valendo.
- Login, cadastro com perfil de risco, confirmação de e-mail, restauração de sessão, logout,
  erros em português, retorno à página de origem após o login.
- Configuração ausente ou chave secreta no frontend: mensagem e formulários desabilitados.
- Modo `supabase`: `/dashboard` mostra a conta lida de `profiles`; carteiras e demais módulos
  exibem "Em desenvolvimento" (sem dados demo e sem chamadas à API Go).

## Identidade visual

- Tokens em `src/styles/theme.css`; Tailwind lê as variáveis, então todas as páginas existentes
  adotaram o tema sem serem reescritas.
- Fontes Unbounded e Inter hospedadas no projeto; Google Fonts removido.
- Landing pública em `/` (antes redirecionava para `/dashboard`).
- Login e cadastro em layout dividido; componentes compartilhados, sidebar e modal atualizados.
- `components/charts` (AreaSpark, DonutRing, SegmentBar) para a evolução do dashboard.

## Testes executados

| Teste | Ambiente | Resultado |
|---|---|---|
| Migrations + `rls_isolation.sql` | PostgreSQL 16 com stub do Supabase Auth | 13/13 |
| Mutações (sem RLS em portfolios; sem RLS em transactions; FK simples) | idem | as 3 detectadas |
| Fluxo demo completo, persistência, celular, rotas | Chromium | aprovado |
| Landing: âncoras, status, rotas, movimento reduzido | Chromium | aprovado |
| Supabase Auth (respostas do Auth e do REST simuladas) | Chromium | 8/8 passos |
| Sem variáveis / com chave secreta | Chromium | mensagem, formulário desabilitado |
| `npm run build`, `npm run check:domain` | Node | aprovado (19/19) |

Não testado: o projeto Supabase real e o deploy na Vercel (ver `docs/SUPABASE.md`).

## Problemas encontrados e corrigidos nesta rodada

- Função de saldo sem permissão de execução para `authenticated` (bloqueava vendas).
- `update` liberado em `portfolios.user_id` (agora restrito às colunas editáveis).
- Tela em branco no modo Supabase sem variáveis (erro de configuração escapava do `useEffect`).
- Valores monetários quebrando linha nos cards; fundo do menu mobile claro após a troca de tema.

## Pendente

- Carteiras e transações no Supabase (próxima etapa) e fonte de cotações.
- Dashboard definitivo com os novos componentes de gráfico.
- Recuperação de senha; edição de perfil.
- Open Finance (Pluggy), IA (Groq/Grok), alertas, simulações.
- 5 erros de TypeScript em páginas do modo `api`.
