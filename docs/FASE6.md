# Fase 6: assistente de IA e planejamento financeiro

## O que foi implementado

**Correção de segurança (Fase 5).** A descrição original de um lançamento importado é imutável no banco
(trigger `protect_imported_entry`); observações do usuário ficam no campo `note`. A sincronização pelo
servidor continua podendo atualizar os dados vindos da instituição.

**Assistente de IA (Groq).**
- `frontend/server/ai/`: adaptadores de provedor (`providers.ts`), resumo financeiro determinístico
  (`snapshot.ts`), base de ajuda com as funcionalidades existentes (`help.ts`), instruções (`prompt.ts`)
  e handlers com streaming (`handler.ts`). Funções da Vercel: `api/ai/chat.ts` e `api/ai/snapshot.ts`.
- Modelo padrão `openai/gpt-oss-120b` (produção na Groq), com `reasoning_effort: low` e
  `include_reasoning: false`. Respostas curtas e diretas; números só a partir do resumo calculado.
- O resumo é lido com o token do próprio usuário (RLS aplicado) e usa as mesmas funções da interface.
  Não inclui descrições de transações, contas, documentos nem dados de outros usuários.
- Consentimento: a IA começa desligada; o envio do resumo financeiro é uma segunda opção separada
  (Configurações → Privacidade, ou no próprio chat).
- Limites: 12 mensagens, 1.500 caracteres por mensagem, 10 perguntas/min e 150/dia por usuário (por
  instância da função), 20 s até o primeiro trecho, 45 s no total. Cancelamento repassado ao provedor.
- Interface: o mesmo componente de conversa no chatbot flutuante e na página Análise IA (histórico da
  sessão compartilhado, Markdown leve, copiar, interromper, tentar de novo, sugestões por página).
  A Análise IA mostra os indicadores por regra, gera um diagnóstico e exibe "Ver dados enviados".

**Gemini.** Adaptador com a mesma interface, usado somente no modo de comparação
(`AI_COMPARE_ENABLED=true`). Nesse modo o servidor substitui qualquer dado real por um resumo sintético
fixo. Com `AI_PROVIDER=gemini`, o chat real é recusado. Não há troca automática de provedor.
O nome `gemini-2.5-flash` foi verificado apenas em fontes secundárias: confirme na listagem de modelos
da sua conta antes de usar.

**Planejamento** (migration `20261114090000_planning.sql`, com RLS):
- Metas com valor inicial, aportes e retiradas; o acumulado vem só dos aportes registrados; retirada
  acima do guardado é recusada no banco.
- Orçamentos mensais por categoria, calculados sobre o mesmo resumo das Finanças (sem transferências,
  aplicações, faturas, pendentes e itens a revisar).
- Categorias: novas predefinidas (Freelance, Venda de bens, Comissões, Rendimentos, Reembolsos, Compras,
  Assinaturas) e personalizadas (criar, renomear, desativar), sem quebrar lançamentos antigos.
- Estado de leitura dos alertas.

**Simulações, Analytics e Alertas.** Funções em `src/domain/simulation.ts`, `planning.ts` e
`insights.ts`. Taxa anual tratada como efetiva: mensal = (1 + anual)^(1/12) − 1; aportes ao fim do
mês; sem impostos, taxas e inflação. Analytics mantém investimentos cadastrados e importados separados.
Alertas são gerados por regras ao abrir o app; não há monitoramento em segundo plano nem envio externo.

O modo `api` legado deixou de ter as telas antigas de IA, Analytics, Simulações e Alertas, que
dependiam do backend Go que não compila.

## Aplicar no Supabase

1. SQL Editor → execute `supabase/migrations/20261114090000_planning.sql`.
2. Execute `supabase/tests/planning_isolation.sql` e `open_finance_isolation.sql` → "todos os testes passaram".
3. Rode de novo `finance_isolation.sql` e `rls_isolation.sql`.

## Configurar a Groq

1. Crie a conta em https://console.groq.com e gere uma chave em API Keys.
2. Local: em `frontend/.env.local`, adicione `GROQ_API_KEY=...` (sem `VITE_`) e reinicie o `npm run dev`.
3. Vercel: Settings → Environment Variables → `GROQ_API_KEY` (e opcionalmente `GROQ_MODEL`); faça um novo deploy.
4. No app: Configurações → Privacidade → ative "Usar o assistente de IA" e, se quiser, "Incluir meu resumo financeiro".

Sem a chave, o chat mostra que o assistente não está configurado; o restante do sistema funciona normalmente.

## Comparar Groq e Gemini

No terminal, com as chaves apenas no ambiente da sessão:

```bash
cd frontend
GROQ_API_KEY=... GEMINI_API_KEY=... npm run compare:ai
```

O script roda as seis perguntas definidas (preço médio, alimentação com dados sintéticos, concentração,
como registrar compra, rentabilidade sem dados, resposta em uma frase) e mostra tempo até o primeiro
trecho, tempo total, número de trechos e as respostas. Usa somente dados sintéticos.

## Roteiro de validação

1. Lance despesas de Alimentação (320,00) e Moradia (1.200,00); defina orçamento de Alimentação em 300,00;
   crie a meta "Viagem" de 4.000,00 com 500,00 guardados.
2. Finanças → Orçamentos: Alimentação "Ultrapassado", 107%. Alertas: "Orçamento de Alimentação ultrapassado".
3. Ative a IA e o resumo. No chat: "Quanto gastei com alimentação?" → resposta curta citando R$ 320,00.
4. "Qual minha rentabilidade?" → o assistente deve dizer que não há dados suficientes.
5. Análise IA → "Ver dados enviados": totais e categorias, sem descrições de lançamentos.
6. Simulações: 1.000 + 300/mês, 60 meses, 10% ao ano → projetado R$ 24.578,88.
7. Com a conta B: sem metas, orçamentos ou conversa da conta A.

## Testes executados (ambiente local, sem acesso à Groq ou ao Gemini reais)

- `npm run check:planning`: 34 (juros compostos, conversão de taxas, aporte necessário, prazos, metas,
  orçamentos, regras de alerta, entradas inválidas, mês vazio).
- Handler da IA com banco real e provedores simulados: 27 (sessão, isolamento, valores iguais ao domínio,
  dados sem descrições, injeção em nome de categoria, consentimento, histórico limitado, streaming
  incremental no servidor, cancelamento, 429 do provedor, limite por usuário, Gemini só sintético,
  ausência de segredos).
- SQL: `planning_isolation.sql` e as três suítes anteriores (com a nova verificação da descrição).
- Navegador: modo demo (metas, orçamentos, categorias, simulações, analytics, alertas) e modo Supabase
  (chat, consentimento, interromper, histórico após recarga, Análise IA, isolamento entre usuários).
- Regressões das Fases 3, 4 e 5. TypeScript: 0 erros.

O streaming dentro do navegador não foi provado no teste automatizado (o interceptador entrega a
resposta inteira); foi provado no servidor. Valide no `npm run dev` com a chave real.
