import { TUTORIALS } from '../../src/tutorials/content.js';

/** Base de ajuda: descreve apenas o que existe no site. Usada pelo assistente para explicar o uso. */
export const SITE_HELP = `
Dashboard: patrimônio das carteiras manuais (capital aplicado = custo das posições; valor de mercado = quantidade × cotação da brapi quando disponível), resultado realizado e não realizado, distribuição, principais posições, atividade recente, resumo de contas conectadas e investimentos importados (separados das carteiras).
Carteiras: criar, editar e excluir carteiras; botão "Nova Transação" registra compra ou venda feita fora da plataforma (não executa ordens); preço médio pelo custo médio com taxas; venda acima da quantidade é recusada; abas Posições, Transações e Alocação; seção "Investimentos importados" com dados do Open Finance.
Finanças pessoais: abas Visão do mês, Metas, Orçamentos e Categorias. Visão do mês: receitas, despesas e saldo do período (não é saldo bancário), gráficos por categoria e diário, filtro por mês, "Nova movimentação" para lançamento manual, importados com origem e selos (Pendente, Transferência, Investimento, Fatura, Estorno, Revisar); importados podem ser reclassificados (categoria e natureza) e receber anotação, mas valor, data e descrição vêm do banco.
Metas: criar meta com valor-alvo e data opcional; registrar aportes e retiradas; o acumulado vem só dos aportes registrados; mostra restante, progresso, ritmo e aporte necessário até a data.
Orçamentos: limite mensal por categoria de despesa com percentual de alerta; compara com as despesas do mês, sem transferências, faturas, pendentes ou itens a revisar.
Categorias: categorias predefinidas e personalizadas (criar, renomear, desativar).
Simulações: projeção com juros compostos (valor inicial, aporte mensal, prazo, taxa mensal ou anual efetiva), comparação de dois cenários e cálculo de aporte para uma meta. São hipotéticas, sem impostos, taxas ou inflação.
Analytics: receitas e despesas por mês, gastos por categoria, saldo do período, aportes em metas, orçamento planejado e realizado, distribuição e concentração das carteiras e investimentos importados separados.
Alertas: alertas por regras (orçamento, metas, concentração, cotação indisponível, conexões) calculados ao abrir o app; podem ser marcados como lidos. Não há envio por e-mail ou celular.
Integrações (menu lateral, também acessível em Configurações): Central de Integrações com resumo (instituições, contas, movimentações importadas, investimentos, pendências), cards por instituição com status e última sincronização; "Conectar banco" abre a janela oficial do Open Finance (Pluggy); "Sincronizar", "Reconectar" e "Desvincular". O site não pede nem guarda senhas bancárias.
Configurações: perfil, senha, aparência, preferências financeiras, notificações (preferências), privacidade e uso do assistente de IA.
Não existem no site: execução de compras ou vendas na bolsa, Pix ou pagamentos, relatórios em PDF, notificações externas, dashboard alternável, conciliação automática entre carteiras manuais e investimentos importados.
`.trim() +
  '\nGuias (botão Guia no topo de cada área; também em Configurações → Tutoriais e ajuda):\n' +
  TUTORIALS.map((t) => `${t.title}: ${t.steps.map((st) => `${st.title} — ${st.body}`).join(' ')}`).join('\n');

export const PAGE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  carteiras: 'Carteiras',
  financas: 'Finanças pessoais',
  metas: 'Finanças pessoais → Metas',
  orcamentos: 'Finanças pessoais → Orçamentos',
  simulacoes: 'Simulações',
  analytics: 'Analytics',
  alertas: 'Alertas',
  configuracoes: 'Configurações',
  integracoes: 'Integrações',
  analise: 'Análise IA',
};
