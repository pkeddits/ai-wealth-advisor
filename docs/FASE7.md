# Fase 7: estabilidade, publicação e experiência

## 1. Segurança e dependências

`npm audit` antes: 11 vulnerabilidades (9 moderadas, 2 altas). Depois:

| | Antes | Depois |
|---|---|---|
| `npm audit --omit=dev` (vai para o navegador) | 3 (2 moderadas, 1 alta) | **0** |
| `npm audit` (inclui ferramentas de desenvolvimento) | 11 | 6 moderadas |

Corrigido:
- **react-router-dom 6 → 7.18.5** (produção): redirecionamento aberto por barra invertida. Além da
  atualização, o login passou a aceitar como destino de retorno apenas caminhos internos (rejeita
  `//`, `\` e URLs absolutas).
- **zod 3 → 4.6.7** e **@hookform/resolvers 3 → 5.9.2** (produção): consumo de memória com coleções
  muito grandes. Os formulários foram retestados (campos obrigatórios, e-mail inválido, senha fraca).
- **vite 5 → 6.4.6** e **@vitejs/plugin-react 4.7** (desenvolvimento): leitura de arquivos pelo servidor
  de desenvolvimento e esbuild vulnerável (o vite 6 usa esbuild corrigido).

Pendente (somente desenvolvimento, sem efeito no site publicado):
- **@typescript-eslint 7 (+ minimatch)**, 6 moderadas: negação de serviço no linter com padrões de
  arquivo maliciosos. A versão mais recente publicada (8.72.2) ainda está na faixa afetada; não há
  correção. Mitigação: o linter roda só localmente, sobre o próprio código, e não faz parte do build.

Não foi usado `npm audit fix --force`.

**Segredos.** Varredura em todo o histórico (37 commits, 9 branches): nenhum `.env` versionado e
nenhuma credencial real; só marcadores de exemplo. Antes de publicar, rode `sh scripts/scan-secrets.sh`
no **seu** repositório (ele pode ter commits que não estão aqui). Como revogar e substituir chaves:
`docs/DEPLOY.md`, seção 1.

## 2. O que foi implementado

**Chatbot e conversas**
- Várias conversas (migration `20261115090000_conversations.sql`, RLS): nova conversa, título automático
  pela primeira pergunta, renomear, excluir com confirmação, reabrir. A conversa ativa é a mesma no
  chatbot e na Análise IA, continua após recarregar e é descartada ao trocar de conta.
- Guardado: só o texto da pergunta e da resposta final. Nunca guardados: resumo financeiro enviado ao
  modelo, raciocínio do modelo, tokens, mensagens de erro.
- Interface: animação de envio e de entrada das mensagens, indicador "Analisando", cursor de geração,
  pulso no ícone enquanto gera, botão "Ir para o fim" quando o usuário sobe a conversa durante uma
  resposta. Sem atrasos artificiais; o texto aparece conforme chega da Groq.

**Central de Integrações** (`/integracoes`, no menu entre Inteligência e Conta; Configurações →
Integrações leva à mesma página): resumo (instituições, contas, movimentações importadas, investimentos
ativos, pendências de revisão), um card por instituição com status, horário da última sincronização,
tipos de dados, contas e as ações Sincronizar, Reconectar e Desvincular. Na demonstração, mostra o que
a integração faz, sem simular conexão.

**Dashboard alternável**: seletor "Investimentos" e "Finanças" (com seta complementar), troca animada
sem recarregar, escolha salva. A visão Finanças mostra receitas, despesas, saldo do período, tendência
de 6 meses, distribuição dos gastos, orçamentos e metas.

**Investimentos manuais e importados**: em Carteiras, três modos: Minhas carteiras, Meus bancos e Visão
completa (padrão). Na visão completa os subtotais ficam lado a lado e não são somados.
Conciliação manual entre posições **não foi implementada**: exigiria vincular registros de origens
diferentes sem histórico de compras confiável; ficou para uma versão futura.

**Investimentos resgatados**: "registros recebidos", "posições ativas" e "totalmente resgatados" são
exibidos separadamente; os resgatados ficam numa lista própria. Registros sem status não são escondidos.

**Finanças pessoais**
- Um único seletor de mês ("Período"), que vale para a Visão do mês e para Orçamentos; oculto em Metas
  e Categorias.
- Metas: o ritmo mensal só é estimado com aportes em pelo menos dois meses diferentes. Com um aporte
  isolado aparece "Histórico insuficiente para estimar seu ritmo mensal.". Novo campo "Aporte mensal
  planejado" gera uma projeção identificada como hipotética, separada do valor guardado.

**Dados enviados à IA**: o modal virou um resumo legível (período, tipos de informação, o que nunca é
enviado, como desativar), com "Ver detalhes técnicos" opcional.

## 3. Bugs corrigidos

- Estimativa de prazo de metas baseada em um único aporte (R$ 11.000 viravam "R$ 11.000/mês").
- Dois seletores de mês em Finanças pessoais que podiam mostrar meses diferentes.
- Investimento com status `TOTAL_WITHDRAWAL` sumia sem explicação; registros sem status eram filtrados.
- Destino de retorno do login aceitava `/\dominio-externo`.
- Título da conversa não aparecia no chatbot após recarregar.

## 4. Não implementado nesta fase

- **Tutoriais interativos** (prioridade 6) e o motion design adicional em login e landing (prioridade
  7): não iniciados para não comprometer a estabilidade antes da apresentação.
- Conciliação entre investimentos manuais e importados.
- Envio de notificações por e-mail (as preferências continuam apenas salvas, como indicado na tela).

## 5. Testes executados (nenhum contra serviços reais)

| Tipo | O que |
|---|---|
| Unitários | `check:domain` 30, `check:quotes` 31, `check:openfinance` 23, `check:planning` 36 |
| SQL (PostgreSQL local) | carteiras, finanças, Open Finance, planejamento, conversas: 5 suítes |
| Navegador + servidor de desenvolvimento real + RLS real | **streaming visto no navegador** (texto crescendo a cada 300 ms), conversas (criar, alternar, renomear, excluir, recarregar, mesma conversa na Análise IA, isolamento) |
| Navegador, modo Supabase com Pluggy simulada | Central de Integrações (contagens e card), modos de investimento, resgatados, Fase 5 completa |
| Navegador, modo demo | dashboard alternável, seletor de mês, metas, Fase 6 completa, rotas com recarga, navegação |
| Navegador, Fase 3 | login, carteiras, operações, logout, isolamento |
| Formulários com zod 4 | cadastro e login |
| Build, TypeScript (0 erros), segredos no bundle (nenhum) | |

Não testado: Groq real, Pluggy Sandbox real, brapi real, e a URL publicada na Vercel.

## 6. Roteiro para a apresentação (cerca de 10 minutos)

1. **Landing** (1 min): proposta, seções animadas, botão "Entrar na demonstração".
2. **Carteiras** (2 min): carteira de exemplo, compra e venda, preço médio, cotação da brapi,
   resultado realizado e não realizado.
3. **Finanças pessoais** (2 min): lançamentos, categorias, orçamento ultrapassado, meta com aporte
   planejado.
4. **Dashboard alternável** (1 min): Investimentos ↔ Finanças.
5. **Integrações** (2 min, conta real): Conectar banco → Pluggy Bank (`user-ok`, `password-ok`,
   `123456`), cards, movimentações importadas, reclassificação, Meus bancos com resgatado separado.
6. **IA** (2 min): consentimento, pergunta "Quanto gastei com alimentação?", resposta em streaming,
   "O que a IA recebe", conversas.
7. **Segurança** (30 s): RLS, chaves só no servidor, IA sem descrições de transações.

Tenha um plano B: se a rede da sala falhar, use o modo demo (não depende de serviços externos).

## 7. Checklist de publicação

- [ ] Migrations aplicadas no Supabase, incluindo `20261115090000_conversations.sql`
- [ ] Testes SQL executados no Supabase (incluindo `conversations_isolation.sql`)
- [ ] `sh scripts/scan-secrets.sh` sem "ENCONTRADO"
- [ ] Repositório público no GitHub sem `.env.local`
- [ ] Projeto na Vercel com Root Directory `frontend` e variáveis de `docs/DEPLOY.md`
- [ ] Site URL e Redirect URLs do Supabase Auth com o domínio da Vercel
- [ ] Verificação pós-deploy de `docs/DEPLOY.md`, seção 5, na URL publicada
- [ ] Teste com duas contas diferentes na URL publicada
