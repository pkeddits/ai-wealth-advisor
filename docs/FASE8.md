# Fase 8: acabamento visual, tutoriais e experiência

Fase de acabamento sobre a Fase 7. Nenhuma migration nova; nenhuma mudança na lógica de cálculo,
na brapi, nas conversas ou no RLS.

## 1. Open Finance: erro de trial e Central de Integrações

**Erro `TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED`.** Aparece quando o widget oficial da Pluggy tenta
criar a conexão com uma instituição real numa aplicação que ainda está no ambiente de testes. Antes,
virava uma mensagem genérica. Agora um classificador único (`src/domain/openFinanceErrors.ts`), usado
pelo servidor (`server/pluggy/client.ts`) e pelo widget (`ConnectBankButton`), separa:

| Tipo | Exemplos de código | Mensagem |
|---|---|---|
| Ambiente de testes | `TRIAL_CLIENT_*` | Só o Pluggy Bank está disponível; bancos reais após a aprovação de produção |
| Credenciais da aplicação | 401/403 do provedor, chave inválida | Integração indisponível no momento |
| Credenciais na instituição | `INVALID_CREDENTIALS`, `LOGIN_ERROR`, `ACCOUNT_LOCKED` | Confira usuário, senha ou código |
| Autorização | `USER_AUTHORIZATION_NOT_GRANTED`, `WAITING_USER_ACTION` | Conclua a autorização no banco |
| Instituição | `SITE_NOT_AVAILABLE`, `CONNECTION_ERROR` | Costuma ser temporário |
| Genérico | demais | Tente novamente |

O código bruto não é exibido. Nada tenta contornar a restrição: a integração, as credenciais e o fluxo
do Sandbox foram mantidos. Quando a Pluggy aprovar o acesso de produção, mude `VITE_OPEN_FINANCE_ENV`
para `production` e faça um novo deploy; o fluxo de conexão é o mesmo.

**Central de Integrações.** Cada instituição mostra contas, movimentações importadas, investimentos
ativos (e resgatados) e itens para revisar, calculados por consultas de contagem filtradas pelas contas
daquela conexão. Conexões de teste recebem o selo "Sandbox · dados fictícios" (identificado pelo nome do
conector, como "Pluggy Bank"). Com `VITE_OPEN_FINANCE_ENV=sandbox`, a página mostra o aviso de ambiente
de testes e a lista recolhível de cenários do Sandbox (`user-ok`, `user-ok-auth-pending`, `user-locked`,
`user-error`), sempre identificados como fictícios. Bancos reais não são anunciados como disponíveis.

## 2. Tutoriais

Oito guias, um por área: Dashboard, Carteiras, Finanças pessoais, Análise IA, Analytics, Simulações,
Integrações e Alertas (18 etapas no total).

- **Capturas reais** da interface atual, com dados fictícios, em `frontend/public/tutorials/*.jpg`.
  As áreas destacadas foram medidas na própria captura (`src/tutorials/highlights.json`).
- **Texto** em `src/tutorials/content.ts`. O assistente recebe esse texto na base de ajuda; nenhuma
  imagem é enviada à IA.
- **Modal:** barra de progresso, etapas clicáveis, Pular, X, Anterior/Próximo, setas do teclado e Esc;
  zoom suave em direção ao destaque, desligado com movimento reduzido ou animações reduzidas no app.
- **Quando aparecem:** na primeira visita a cada área. O guia conta como visto ao concluir, pular ou fechar.
- **Reabrir:** botão **Guia** no topo de cada área, ou **Configurações → Tutoriais e ajuda** (lista com
  miniaturas, indicação de concluído e "Recomeçar todos os guias").

Para regenerar as capturas depois de mudanças visuais, o roteiro usado está descrito na seção 6.

## 3. Visual e textos

- **Login:** vitrine com seis cartões flutuantes (patrimônio com mini gráfico, assistente, orçamento,
  meta, conta conectada, alerta), parallax com o mouse e brilho ambiente. Valores identificados como
  ilustrativos.
- **Landing:** sem "Planejado", "Projeto acadêmico" ou "fase de testes"; Open Finance e IA apresentados
  como disponíveis, com a observação de que bancos reais dependem de liberação. Aviso legal mantido no
  rodapé e no login.
- **Site interno:** elevação suave no hover em cards de Analytics, Simulações, metas, orçamentos,
  indicadores, Integrações e Dashboard (Finanças); brilho ambiente no fundo da área logada.
- **Desempenho:** o brilho ambiente usa gradiente radial em vez de `filter: blur`. A primeira versão
  com desfoque derrubava a landing para 10 quadros/s no navegador de testes; a versão final mede 33
  (36 sem o efeito). Login: 58.
- **Funcionalidades indisponíveis** continuam identificadas como "Em breve": e-mail, verificação em
  duas etapas, exportação e exclusão de conta. Análise IA no menu da demonstração aparece como "Com conta".

## 4. Notificações

O envio por e-mail está desabilitado e marcado como "Em breve". As preferências "Alertas de metas",
"Alertas de orçamento e carteira" e "Alertas de integrações" agora filtram de fato a página Alertas
(antes eram apenas salvas).

## 5. Preferências novas (localStorage, por navegador)

| Chave | Padrão | Uso |
|---|---|---|
| `tutorialsAuto` | `true` | Abre o guia na primeira visita a cada área |
| `tutorialsSeen` | `[]` | Guias já vistos |
| `notifications.integrations` | `true` | Exibe alertas de integrações |

Variável de ambiente nova: `VITE_OPEN_FINANCE_ENV` (`sandbox` ou `production`).

## 6. Testes executados

Todos locais (PostgreSQL e PostgREST reais com RLS; Pluggy, Groq e brapi simuladas).

| Teste | Resultado |
|---|---|
| `check:domain`, `check:quotes`, `check:openfinance` (com 8 casos de erro da Pluggy), `check:planning` | 30, 31, 31, 36 |
| SQL: carteiras, finanças, Open Finance, planejamento, conversas | 5 suítes aprovadas |
| Integração do handler de IA | 27/27 |
| Integração dos handlers da Pluggy | 35/35 |
| Navegador, tutoriais: abertura, etapas, teclado, X, Pular, persistência, botão Guia, Configurações, recomeçar, desligar, celular | aprovado |
| Navegador, movimento reduzido nos guias (sistema e preferência do app) | aprovado |
| Navegador, login e landing sem textos de protótipo, com aviso legal; quadros/s | aprovado |
| Navegador, Central com indicadores por instituição e selo Sandbox | aprovado |
| Regressões: Fases 3 a 7 (demo e conta), streaming com conversas, rotas | aprovadas |
| TypeScript, build | 0 erros |

Duas verificações antigas foram atualizadas porque testavam textos substituídos de propósito em fases
anteriores ("Cotações ainda não integradas", da Fase 2, e o JSON bruto do modal de dados da IA, que
virou resumo legível na Fase 7).

Capturas dos tutoriais: geradas com o servidor de desenvolvimento em modo demo (Dashboard, Carteiras,
Finanças, Analytics, Simulações, Alertas) e em modo conta com dados fictícios semeados no banco local e
a Groq simulada (Análise IA, Integrações).

## 7. O que testar manualmente

1. **Banco real na janela da Pluggy:** a mensagem de ambiente de testes deve substituir o erro genérico.
2. **Sandbox:** conectar o Pluggy Bank (`user-ok`, `password-ok`, `123456`), sincronizar, reconectar,
   desvincular; conferir os indicadores do card.
3. **Guias:** primeira visita de cada área, botão Guia, Configurações → Tutoriais e ajuda.
4. **Landing e login** no notebook da apresentação: fluidez das animações.
5. **Assistente com a Groq real:** respostas em partes, conversas, diagnóstico.
6. **Duas contas:** isolamento de dados, conversas e guias (os guias vistos ficam por navegador).

## 8. Limitações

- Conexão com bancos reais depende da aprovação da Pluggy; até lá, só o Sandbox.
- Duas instituições na mesma conta: a interface comporta, mas não foi testado com dois conectores reais.
- O selo Sandbox usa o nome do conector, não uma marcação do provedor.
- Os guias vistos ficam salvos por navegador, não por conta.
- As capturas dos guias precisam ser regeneradas se as telas mudarem bastante.
- Envio de e-mail não implementado.
