# Fase 1: versão de demonstração (09/11/2026)

Código original preservado na tag Git `original-caion` (commit `831ecc5`).
Ver diferenças: `git diff original-caion HEAD`. O backend Go **não foi alterado**.

## Problemas corrigidos

| Problema (comprovado em teste) | Correção | Arquivo |
|---|---|---|
| Spinner infinito em todas as rotas: `AuthProvider` nunca era usado | Envolver `App` com `AuthProvider` | `src/main.tsx` |
| Detalhe da carteira derrubava a aplicação (React error #130) | Ícones das abas como componente | `src/pages/PortfolioDetailPage.tsx` |
| Detalhe recebia só o id: nome/descrição vazios | Carrega a carteira pelo id; "Carteira não encontrada" | idem |
| Botão "Editar/Salvar" sem efeito; aba Performance só com texto de placeholder | Removido; gráfico real de alocação; evolução "em desenvolvimento" | idem |
| Erros de transação em `alert()` e sem validação | Validação e mensagem dentro do modal | idem |
| `/portfolios/new` caía na rota de detalhe com id "new" | `/portfolios?nova=1` abre o modal | `PortfoliosPage.tsx`, `DashboardPage.tsx` |
| Tela branca quando a API não devolve lista (`undefined.reduce`) | Store aceita lista/`{data}` e senão mostra erro | `src/store/portfolioStore.tsx` |
| "Principais posições" sempre vazio | Usa a carteira da lista atualizada | `DashboardPage.tsx` |
| Números fixos: "Alertas Ativos: 3", sino "3" | Card calculado; sino e tema (não implementados) removidos | `DashboardPage.tsx`, `Header.tsx` |
| Credenciais demo que não existiam | Removidas | `LoginPage.tsx` |
| 32 usos de `icon` ignorados; `className` do Input descartado | Props implementadas | `Button.tsx`, `Input.tsx` |
| Header com recuo duplicado (`lg:ml-64`) | Removido | `Header.tsx` |
| No celular a sidebar cobria o conteúdo e bloqueava cliques | Menu recolhível | `Sidebar.tsx`, `Header.tsx`, `store/uiStore.ts` |
| Cadastro chamava `register` com 4 argumentos | Objeto | `RegisterPage.tsx` |
| `alert` sombreado em `AlertsPage` | Renomeado | `AlertsPage.tsx` |

TypeScript: 65 → 5 erros. Os 5 restantes estão em Alertas, IA e Simulações (exibidas como
"Em desenvolvimento" no modo demo) e não afetam o build.

## Novo: modo demonstração

- `src/config/appMode.ts`: `isDemoMode` (padrão `true`; `VITE_DEMO_MODE=false` usa a API).
- `src/services/index.ts`: ponto único de troca demo/API. Páginas importam daqui.
- `src/services/demo/*`: mesmo formato dos services reais (checado com `typeof`), dados em
  `localStorage` (chave `aiwa.demo.v1`), catálogo com **preços fictícios fixos**.
- `src/domain/positions.ts`: cálculo puro de posições (custo médio), valor, ganho, alocação.
- `DemoBanner`, `ComingSoon`, marcação "Em breve" na sidebar, carteira de exemplo.

## Testado no navegador (Chromium) e funcionando

- Entrar no demo; sessão mantida no reload; sair volta ao login.
- Criar carteira; registrar compra e venda; venda acima do saldo é recusada.
- Posições, transações e gráfico de alocação; dashboard atualizado com valores conferidos
  manualmente (ex.: R$ 4.927,50, retorno R$ 127,50 = 2,66%).
- Recarregar mantém os dados; id inexistente mostra "Carteira não encontrada".
- IA, Analytics, Simulações, Alertas e Configurações mostram "Em desenvolvimento".
- Nenhuma requisição a `/api` e nenhum erro JavaScript no modo demo.
- Celular (390 px): menu abre, fecha ao navegar, conteúdo clicável.
- Modo API (`VITE_DEMO_MODE=false`): build sem código demo, login original.
- `npm run check:domain`: 19 verificações dos cálculos.

**Não testado:** deploy real na Vercel (feito pelo grupo; ver `docs/DEPLOYMENT.md`).

## Pendente (Fase 2 em diante)

Backend real e banco (PostgreSQL), autenticação real, cotações reais, IA, analytics,
simulações, alertas, configurações de conta, edição/exclusão de transações na interface,
histórico de patrimônio, lucro realizado nas vendas, 5 erros de TypeScript restantes.
