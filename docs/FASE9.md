# Fase 9: produção, sincronização entre dispositivos, mobile e motion

Branch `fase-9`, sobre a `fase-8.1`. Sete commits, um por prioridade:

| Commit | Conteúdo |
|---|---|
| `fix(producao)` | Funções da Vercel carregam no Node ESM; erros da IA classificados; diagnóstico `/api/health` |
| `feat(conta)` | Preferências, guias e foto de perfil na conta (Supabase), com testes de isolamento |
| `feat(mobile)` | Navegação inferior, assistente em tela cheia, layouts sem estouro, teclado virtual |
| `feat(motion)` | Linguagem de movimento, sinal de mudança de valor, luz por área, estados de ação, landing |
| `fix(seguranca)` | Dados privados descartados antes da primeira renderização da nova sessão |
| `style` | Rodapés de formulário no celular e capturas |
| `docs` | Este documento, guia de publicação e README |

## 1. Produção na Vercel

### Causa encontrada

O `frontend/package.json` declara `"type": "module"`. A Vercel transpila cada arquivo de `api/` e
`server/` separadamente, sem empacotar, e executa em Node ESM. Nesse modo, um import relativo precisa
de extensão: `import { handleChat } from '../../server/ai/handler'` falha com `ERR_MODULE_NOT_FOUND`
antes de qualquer linha da função rodar. No `npm run dev` o mesmo código funciona porque o Vite
resolve os imports como bundler (`ssrLoadModule`).

Reproduzi o runtime da Vercel localmente (`npm run check:functions`): na Fase 8.1, **as sete funções**
falham ao carregar, incluindo Pluggy e cotações, não só a IA. A IA tinha ainda um segundo bloqueio:
`src/tutorials/content.ts` importava `highlights.json`, o que no Node ESM exige `with { type: 'json' }`.

### Correções

- Imports relativos com `.js` em todo o código alcançado pelas funções (`api/`, `server/` e os
  módulos de `src/domain` e `src/tutorials` que elas usam). Os destaques dos guias viraram módulo TS.
- Variáveis do servidor normalizadas (`server/env.ts`): espaço, aspas e quebra de linha coladas no
  painel da Vercel são removidos. Um `\n` no fim da chave invalida o header `Authorization`.
- O handler da IA lê o primeiro trecho da Groq antes de responder. Antes, a resposta 200 já tinha
  saído quando a falha aparecia, e todo erro chegava igual. Agora:

  | Situação | HTTP | `code` |
  |---|---|---|
  | Sem `GROQ_API_KEY` ou `AI_PROVIDER` diferente de `groq` | 503 | `not_configured` |
  | Chave recusada pela Groq | 503 | `provider_auth` |
  | Modelo inexistente | 503 | `provider_model` |
  | Limite da Groq | 429 | `provider_rate_limit` |
  | Groq instável (5xx) | 502 | `provider_unavailable` |
  | Sem resposta em 20 s | 504 | `provider_timeout` |
  | Sessão inválida | 401 | `session` |

  O streaming continua progressivo depois do primeiro trecho.
- Quando a função nem inicia, a Vercel devolve uma página HTML. O cliente agora identifica isso
  (`src/services/apiError.ts`) e informa que a função falhou, em vez de uma mensagem genérica.
- `/api/health`: diagnóstico autenticado. Mostra **se** cada variável existe (nunca o valor), versão do
  Node, região e commit. Com `?probe=1`, testa a chave da Groq e o modelo, as credenciais da Pluggy e a
  chave secreta do Supabase.
- `vercel.json`: duração máxima para cotações e diagnóstico, cache longo dos arquivos com hash e
  cabeçalhos de segurança (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`).
- `tsconfig.server.json`: o código de servidor passou a ser verificado por `npm run type-check`
  (encontrou um erro de tipo antigo em `server/pluggy/handlers.ts`, corrigido).

### O que não pude verificar

Não tenho acesso à sua conta da Vercel nem às chaves reais. Os testes usam serviços simulados no
mesmo formato de runtime da Vercel. A confirmação real está no checklist (seção 8).

### Como diagnosticar na Vercel

1. **Logs:** Vercel → projeto → Logs, filtre por `/api/ai/chat` e use o chat. Na versão anterior deve
   aparecer `ERR_MODULE_NOT_FOUND`; depois do redeploy, não deve aparecer nenhuma falha de carregamento.
2. **Diagnóstico:** logado no site, no console do navegador:
   ```js
   const k = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
   fetch('/api/health?probe=1', { headers: { Authorization: 'Bearer ' + JSON.parse(localStorage[k]).access_token } })
     .then((r) => r.json()).then(console.log);
   ```
   Esperado: `checks.groq`, `checks.pluggy` e `checks.supabaseSecret` iguais a `ok`, e
   `configuration.secretsExposedAsPublic` vazio. `invalid_credentials` indica chave errada;
   `model_unavailable`, `GROQ_MODEL` inválido; `not_configured`, variável ausente no ambiente.
3. **Ambiente:** confira se as variáveis estão marcadas para **Production** (e Preview, se usar).
   Variáveis novas só valem depois de um novo deploy.

## 2. Conta igual em todos os dispositivos

### Causa

Todas as preferências ficavam num único store Zustand em `localStorage` (`aiwa.preferences.v1`),
inclusive a foto como data URL. Por isso o celular não via a IA ativada no PC, repetia os guias e
mostrava a foto antiga. O mesmo mecanismo fazia duas contas no mesmo navegador compartilharem a
ativação da IA.

### O que fica na conta e o que fica no aparelho

| Na conta (Supabase) | No aparelho |
|---|---|
| Assistente de IA e consentimento do resumo | Detecção de desempenho (`aiwa.perf`, por sessão) |
| Guias vistos, guias pendentes, abertura automática, próximo login | Preferência do sistema por menos movimento, sempre respeitada |
| Foto de perfil ou cor do avatar | Conversa aberta no chat (sessão da aba) |
| Tema, animações, densidade, efeitos, ocultar valores | Cache de cotações (sessão da aba) |
| Visão do dashboard, formatos, página inicial, notificações | Dados da demonstração (modo `demo`) |

### Como funciona

- Migration `20261117090000_account_sync.sql`: amplia `user_settings` com `preferences` (jsonb validado,
  até 8 KB), `tutorials_seen`, `tutorials_replay` e `avatar_path` (só pode apontar para a pasta do
  próprio usuário). Funções atômicas `mark_tutorial_seen`, `reset_tutorials` e
  `consume_tutorials_on_next_login`. Bucket **privado** `avatars` (1 MB, WebP/JPEG/PNG) com políticas
  por pasta do dono. Nada das migrations anteriores foi alterado.
- `src/services/accountSync.ts`: o banco é a fonte de verdade. O navegador guarda um cache **por
  usuário** (`aiwa.preferences.v2:user:<id>`) só para a primeira pintura. Alterações são enviadas com
  500 ms de agrupamento e mescladas por chave sobre o que está no banco, então o PC não desfaz o que o
  celular mudou. Ao voltar para a aba, o app recarrega da conta. Se o envio falhar, a alteração continua
  valendo, o aviso aparece em Configurações e o envio é repetido ao reconectar ou em "Tentar novamente".
- Os guias só abrem depois que o histórico da conta carregou. Isso elimina o "primeiro acesso" falso
  no celular.
- Próximo login: a opção é consumida no banco, de forma atômica, apenas no login explícito. F5 continua
  sem consumi-la; os guias pendentes valem em qualquer aparelho e saem da lista ao serem vistos.
- Foto: recortada em 256 px, enviada como WebP (JPEG no Safari antigo) para `<user_id>/avatar-<hora>`,
  exibida por URL assinada. Cada troca gera um caminho novo, então não há cache antigo; a foto anterior
  é apagada. Sem foto, aparecem as iniciais.
- Logout: limpa o estado em memória e mantém as preferências no banco. Outra conta no mesmo navegador
  começa dos padrões.
- Modo demo: continua 100% local.

"Restaurar" em Aparência apagava todas as preferências, inclusive a IA. Agora restaura só tema,
animações, densidade e efeitos.

## 3. Mobile

Auditoria medida em 12 rotas × 320, 360, 390, 430, 768, 1024 e 1280 px, com dados de exemplo.

- **Causas de estouro corrigidas:** itens de grid com `min-width: auto` crescem até o texto mais largo
  e alargam a coluna. Nas Configurações a página chegava a 1070 px; nos cards do dashboard, 58 px
  além da tela. A rede de segurança `overflow-x: clip` existe, mas a auditoria passa **com ela
  desligada**.
- **Navegação:** barra inferior (Início, Carteiras, assistente, Finanças, Mais), que some enquanto se
  digita. O menu completo abre em "Mais", fecha com Esc, toque fora ou arraste, e trava a rolagem do fundo.
- **Assistente:** painel inferior em tela cheia que acompanha o teclado virtual (`visualViewport`).
  O botão flutuante ficou só no desktop, onde não cobre conteúdo.
- **Formulários e modais:** painéis presos à parte inferior com altura dinâmica (`dvh`), campos com
  16 px nos aparelhos de toque (o iPhone não amplia ao focar), `interactive-widget=resizes-content`
  para o Android redimensionar com o teclado, ação principal sem quebra de linha.
- **Guias:** rodapé fixo com Pular, Anterior e Próximo; captura aproximada na área destacada; troca de
  etapa por gesto.
- **Detalhes:** áreas de toque de 40 px ou mais, banner da demonstração em uma linha, abas roláveis
  com bordas esmaecidas, áreas seguras do iPhone (`viewport-fit=cover`).

Capturas em [`screenshots/fase9/`](screenshots/fase9/).

## 4. Motion

Linguagem em `src/components/motion/tokens.ts`, com três famílias:

- **Resposta** confirma uma ação (toque, envio, troca de aba): curta, com mola firme.
- **Transição** mostra de onde vem e para onde vai o conteúdo (visão do dashboard, conversa, período).
- **Ambiente** é luz lenta de fundo: nunca passa sobre os números e não existe em modo leve.

Aplicações:

- **Sinal de mudança de valor:** o número conta até o novo valor e recebe uma marca breve, verde se a
  mudança é favorável e vermelha se não é. Em despesas e "Para revisar", subir é desfavorável.
- **Luz por área:** os orbes de fundo mudam de tom em Investimentos, Finanças, Inteligência e Integrações.
- **Integrações:** faixa de atividade durante a sincronização, confirmação "Atualizado agora",
  contadores animados e contas que entram ao expandir.
- **IA:** transição entre conversas; texto de espera que acompanha o tempo até o primeiro trecho,
  sem inventar progresso.
- **Simulações:** resultados animados e curvas que transitam de um cenário para o outro, com 300 ms de
  atraso para não reanimar a cada tecla.
- **Landing:** luz que acompanha a rolagem entre as seções e linhas que se desenham na entrada de cada
  seção, feitas com gradientes radiais e `transform`, sem filtros de blur grandes.
- **Toque:** resposta de pressão em superfícies clicáveis, sem depender de hover.

Regras respeitadas: "Reduzida" e "Desligada" nas Configurações, `prefers-reduced-motion` do sistema e
o detector de desempenho, que agora também mede na primeira rolagem e na landing. Em aparelhos que não
acompanham, ele desliga efeitos contínuos e camadas decorativas até o fim da sessão.

Também troquei cinco assinaturas do store de preferências inteiro por seletores: sem isso, cada mudança
de status da sincronização re-renderizaria todas as telas que formatam valores.

## 5. Segurança

- Build em modo Supabase com valores-sentinela: nenhuma chave de servidor aparece no bundle; só a
  publicável do Supabase, que é pública por definição.
- As oito funções exigem sessão válida; o id do usuário vem sempre do token, nunca do cliente. A chave
  secreta só é usada na gravação dos dados da Pluggy, com filtro explícito pelo usuário verificado.
- Erros devolvidos ao navegador não contêm tokens, chaves ou detalhes internos. O único log das funções
  registra o tipo do erro.
- Avatares: bucket privado, URL assinada de 1 hora, leitura e escrita só na pasta do dono.
- Troca de conta: carteiras, cotações, conversas, categorias e URLs de avatar são descartados no mesmo
  instante em que o usuário muda, antes da próxima renderização.
- `sh scripts/scan-secrets.sh`: nada encontrado no histórico Git.
- `npm audit --omit=dev`: 0 vulnerabilidades.

## 6. Testes

| Verificação | Resultado | Comando |
|---|---|---|
| Tipos (app e servidor) | sem erros | `npm run type-check` |
| Domínio, cotações, Open Finance, planejamento | 128/128 | `npm run check:domain` etc. |
| Funções no formato da Vercel (Groq, Pluggy, brapi, diagnóstico) | 129/129 (8.1: 20 falhas) | `npm run check:functions` |
| Sincronização entre dois dispositivos e duas contas | 36/36 | `npm run check:sync` |
| SQL de isolamento | 7/7 suítes | `supabase/tests/*.sql` |
| Regressão funcional no navegador | 24/24 | `scripts/browser/e2e.py` |
| Interação mobile (guia, barra, menu, assistente, teclado, paisagem) | 21/21 | `scripts/browser/interact.py` |
| Estouro horizontal, 12 rotas × 7 larguras, sem a rede de segurança | 84/84 | `scripts/browser/audit.py` |
| Motion e preferências de movimento | 11/11 | `scripts/browser/motion.py` |
| Build de produção | íntegro | `npm run build` |

Os testes SQL rodaram em PostgreSQL 16 local com os stubs de `supabase/tests/support/` (Auth e,
nesta fase, Storage). No seu Supabase, rode-os no SQL Editor depois das migrations.

Os testes com Groq, Pluggy e brapi usam respostas simuladas. Nenhum resultado aqui substitui a
verificação na URL publicada (seção 8).

## 7. Desempenho, antes e depois

Build de produção, mesma máquina, sem GPU (renderização por CPU), mediana de três execuções.

| Cenário | Fase 8.1 | Fase 9 |
|---|---|---|
| Dashboard desktop, rolagem / repouso | 58 / 58 fps | 57 / 60 fps |
| Dashboard e Finanças no celular, rolagem | 60 fps | 60 fps |
| Landing no celular, rolagem | 55 fps | 53 fps |
| Landing desktop, primeira rolagem | 11 fps | 12 fps |
| Landing desktop, depois que o detector simplifica | — | 28 fps |
| JS + CSS (gzip) | 430 KB | 440 KB |

A landing desktop fica lenta **neste ambiente sem GPU** nas duas versões: o custo é rasterizar por CPU
uma página grande cheia de gradientes. Num navegador com aceleração de hardware o resultado tende a ser
bem melhor, mas isso só se confirma no notebook da apresentação (seção 8).

## 8. Checklist manual (depende da sua conta e da Vercel)

**Banco**
1. Se ainda não aplicou, rode `20261116090000_user_settings.sql` (Fase 8.1) e depois
   `20261117090000_account_sync.sql`.
2. Rode `user_settings_isolation.sql` e `account_sync_isolation.sql`: ambos devem terminar com
   "todos os testes passaram".
3. Storage → confirme o bucket `avatars` como **privado**.

**Publicação**
4. Push da branch `fase-9` e redeploy na Vercel (Root Directory `frontend`).
5. Diagnóstico da seção 1: todos os `checks` em `ok`.

**APIs na URL publicada**
6. Chat flutuante e Análise IA respondem, com o texto aparecendo em partes.
7. Pluggy Bank no Sandbox (`user-ok`, `password-ok`, `123456`) conecta e sincroniza.
8. Carteira com ITUB4 mostra a cotação.

**Entre dispositivos** (mesma conta de teste no PC e no celular)
9. Ative a IA no PC → recarregue no celular: ativada.
10. Mude o tema no celular → volte para a aba do PC: tema aplicado.
11. Conclua o guia do Dashboard no PC → abra o Dashboard no celular: o guia não aparece.
12. Troque a foto no celular → volte para a aba do PC: foto nova.
13. Ative "Mostrar tutoriais no próximo login" no PC, dê F5 (não consome), saia e entre no celular:
    cada guia aparece ao abrir a respectiva área.
14. Entre com outra conta no mesmo navegador: nenhuma preferência, foto ou dado da primeira.

**Mobile e apresentação**
15. No celular: barra inferior, menu Mais, assistente com teclado aberto e formulário de movimentação.
16. No notebook da apresentação: landing e dashboard fluidos; em Configurações, alterne Animações entre
    Completa, Reduzida e Desligada.

## 9. Limitações

- Bancos reais dependem da aprovação da Pluggy; a restrição do trial não foi contornada.
- As preferências sincronizam ao abrir o app, ao voltar para a aba e ao reconectar; não há atualização
  em tempo real entre duas abas abertas ao mesmo tempo sem troca de foco.
- Duas edições da **mesma** preferência em aparelhos diferentes, no mesmo instante: vale a última gravada.
- O cache de cotações e o limite de uso da IA são por instância da função na Vercel.
- Sem chave da brapi, o plano gratuito limita os ativos e as requisições por IP; na Vercel o IP é
  compartilhado. Para a apresentação, configure `BRAPI_API_KEY`.
- Na primeira entrada depois desta atualização, cada conta começa com as preferências padrão: as
  antigas estavam no navegador e não identificavam a conta, então não foram migradas, para não misturar
  usuários. A demonstração mantém as suas.
- A landing desktop depende da GPU do aparelho; em máquinas fracas o detector reduz os efeitos.
- Mantidas da fase anterior: sem conciliação entre investimentos manuais e importados, sem histórico de
  cotações, alertas calculados ao abrir o app, backend Go legado sem uso.
