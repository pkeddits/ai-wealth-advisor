# Fase 8.1: guias no próximo login e motion interno

Rodada curta sobre a Fase 8. `VITE_OPEN_FINANCE_ENV` continua `sandbox` por padrão; nada de Pluggy,
brapi, Groq, conversas, carteiras ou cálculos foi alterado.

## 1. Mostrar tutoriais no próximo login

Configurações → Tutoriais e ajuda → **"Mostrar tutoriais no próximo login"**, ao lado de
"Mostrar o guia ao abrir uma área pela primeira vez".

- Salva **na conta**: tabela `user_settings` (migration `20261116090000_user_settings.sql`, com RLS;
  teste `supabase/tests/user_settings_isolation.sql`). Na demonstração, fica neste navegador.
- É aplicada apenas em **login explícito** (`authStore.login`, usado pelo formulário e por "Entrar na
  demonstração"). Restaurar a sessão com F5 não a consome.
- Ao aplicar, a opção é desativada e os oito guias ficam pendentes **só para aquela conta**
  (`tutorialsReplay`, por id de usuário). Cada guia aparece ao entrar na respectiva área, um por vez,
  e deixa de ser pendente ao ser concluído, pulado ou fechado.
- Não altera conversas, dados, os guias já vistos, "Mostrar o guia na primeira visita" nem
  "Recomeçar todos os guias".

Uso sugerido para a apresentação: entre na conta de demonstração, ative a opção, saia. No próximo
login, os guias aparecerão área por área.

## 2. Motion no site interno

| Efeito | Onde | Como |
|---|---|---|
| Inclinação 3D com o ponteiro, elevação e brilho | Indicadores de Finanças no Dashboard, resumo e cards das Integrações, metas, orçamentos, insights, resultados das simulações, diagnóstico da Análise IA | Variáveis CSS escritas no `pointermove` (sem re-render); aplicada só no hover |
| Balões contextuais | Patrimônio (atualização da cotação), saldo do período (% da receita que sobrou), maior gasto, melhor saldo do Analytics, diferença entre cenários, número de indicadores do diagnóstico | Texto derivado dos dados reais da tela; preso à borda; sem cliques |
| Gráficos | Barras do Dashboard de Finanças e do Analytics; linhas das Simulações | Entrada progressiva; as simulações animam só no primeiro desenho e respondem à digitação sem reanimar |
| Troca de visão | Investimentos ↔ Finanças | Deslizamento com leve escala |
| Fundo | Toda a área logada | Terceiro orbe e brilho de horizonte no topo (gradientes, sem desfoque) |

Nenhum valor financeiro foi alterado e nenhum dado fictício aparece em telas reais.

**Acessibilidade e desempenho**
- Movimento reduzido do sistema ou animações "Reduzida"/"Desligada" no app: sem inclinação,
  sem flutuação, sem orbes animados e sem animação de gráficos.
- Modo leve automático (`data-perf="low"`): aparelhos com até 2 GB de memória, ou quando o app mede
  menos de 30 quadros/s nos primeiros segundos da área logada (vale até fechar o navegador).
- Só `transform` e `opacity`; sem `filter: blur`, sem `backdrop-filter` nos balões e sem `will-change`
  permanente. Cards grandes com gráfico não inclinam (custava quadros ao mover o mouse).

## 3. Desempenho medido

Navegador de testes sem GPU (Chromium headless), demonstração com dados de exemplo, mesma metodologia
nas duas versões: entrada = 2 s após abrir; regime = após 4,5 s, mouse sobre um card; movimento =
ponteiro percorrendo a página por 2,5 s.

| Página | Fase 8: entrada / regime / movimento | Fase 8.1: entrada / regime / movimento |
|---|---|---|
| Dashboard de Investimentos | 46 / 60 / 60 | 43 / 60 / 60 |
| Dashboard de Finanças | 46 / 60 / 60 | 38 / 61 / 60 |
| Finanças pessoais | 41 / 60 / 60 | 50 / 61 / 60 |
| Analytics | 48 / 60 / 60 | 51 / 61 / 60 |
| Simulações | 55 / 60 / 60 | 51 / 61 / 60 |
| Integrações | 55 / 60 / 60 | 47 / 61 / 60 |
| Análise IA | 53 / 60 / 60 | 53 / 61 / 60 |

Durante o desenvolvimento a medição encontrou três regressões, corrigidas antes da entrega: brilho do
ponteiro em cards grandes (25 quadros/s ao mover o mouse no Dashboard), desfoque de fundo nos balões e
`will-change` em hover (52–56 parado). A entrada varia alguns quadros entre execuções nas duas versões.

## 4. Texto da landing

"Contas, gastos e explicações com IA chegam nas próximas versões." foi substituído por
"Acompanhe investimentos, organize receitas e despesas e entenda seus resultados com inteligência
artificial, tudo em um só lugar." Avisos legais e a indicação de que bancos reais dependem de
liberação foram mantidos.

## 5. Testes

| Teste | Resultado |
|---|---|
| SQL `user_settings_isolation` + 5 suítes anteriores | aprovados |
| Próximo login, ponta a ponta com RLS real (14 passos: salvar, F5 não consome, novo login, um guia por vez, desativação no banco, pular, reabrir, conversas mantidas, Bruno não afetado, pendentes persistem) | aprovado |
| Motion: balões, inclinação, pointer-events, modo leve, "Reduzida", sistema com movimento reduzido, simulações, celular | aprovado |
| Regressões no modo demo: Fases 6 e 7, navegação, configurações, rotas, tutoriais, login e landing | aprovadas |
| Regressões no modo conta: Fase 3 (login, carteiras, isolamento), Fase 5 (Open Finance), streaming com conversas | aprovadas |
| Integração dos handlers de IA e Pluggy | 27/27 e 35/35 |
| `check:domain`, `check:quotes`, `check:openfinance`, `check:planning` | 30, 31, 31, 36 |
| TypeScript, build | 0 erros |

## 6. Checklist manual

- [ ] Aplicar `20261116090000_user_settings.sql` e rodar `user_settings_isolation.sql` no Supabase
- [ ] Ativar "Mostrar tutoriais no próximo login", apertar F5 (nada deve aparecer), sair e entrar
- [ ] Conferir que só o guia da área aberta aparece e que a opção volta desligada
- [ ] Entrar com outra conta e confirmar que ela não é afetada
- [ ] Passar o mouse nos cards de Finanças, Integrações, metas e simulações
- [ ] Alternar Investimentos ↔ Finanças no Dashboard
- [ ] Ativar animações "Reduzida" em Configurações → Aparência e conferir que os movimentos param
- [ ] Testar no notebook da apresentação e no celular
