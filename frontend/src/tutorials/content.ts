import highlights from './highlights.json';

export type TutorialId = 'dashboard' | 'carteiras' | 'financas' | 'analise' | 'analytics' | 'simulacoes' | 'integracoes' | 'alertas';

export interface TutorialStep {
  title: string;
  body: string;
  image: string;
  /** Área destacada, em porcentagem da captura. */
  highlight?: { x: number; y: number; w: number; h: number };
}

export interface Tutorial {
  id: TutorialId;
  route: string;
  title: string;
  summary: string;
  steps: TutorialStep[];
}

type StepText = Omit<TutorialStep, 'image' | 'highlight'>;

const RAW: { id: TutorialId; route: string; title: string; summary: string; steps: StepText[] }[] = [
  {
    id: 'dashboard', route: '/dashboard', title: 'Dashboard', summary: 'Seu resumo de investimentos e finanças em um só lugar.',
    steps: [
      { title: 'Duas visões, um painel', body: 'Use o seletor "Investimentos" e "Finanças" para trocar o resumo exibido. A escolha fica salva para a próxima visita.' },
      { title: 'Patrimônio das carteiras', body: 'Capital aplicado é quanto você investiu pelo custo. Valor de mercado usa a cotação mais recente; se uma cotação estiver pendente, o valor não é estimado.' },
      { title: 'Finanças do mês', body: 'Na visão Finanças você vê receitas, despesas, saldo do período, orçamentos e metas. O saldo do período não é o saldo da sua conta bancária.' },
    ],
  },
  {
    id: 'carteiras', route: '/portfolios', title: 'Carteiras', summary: 'Crie carteiras e registre compras e vendas.',
    steps: [
      { title: 'Crie uma carteira', body: 'Clique em "Nova Carteira" para separar seus investimentos por objetivo, como longo prazo ou renda.' },
      { title: 'Registre operações', body: 'Dentro da carteira, use "Nova Transação" para lançar uma compra ou venda que você fez na sua corretora. O Wealth Advisor não executa ordens.' },
      { title: 'Preço médio e resultado', body: 'Informe quantidade, preço e taxas. O preço médio e o resultado são calculados automaticamente, e vendas acima da quantidade disponível são recusadas.' },
    ],
  },
  {
    id: 'financas', route: '/financas', title: 'Finanças pessoais', summary: 'Receitas, despesas, metas, orçamentos e categorias.',
    steps: [
      { title: 'Escolha o período', body: 'O seletor "Período" define o mês exibido na Visão do mês e em Orçamentos.' },
      { title: 'Registre movimentações', body: 'Use "Nova movimentação" para lançar receitas e despesas manuais. Movimentações importadas do seu banco aparecem com a origem identificada.' },
      { title: 'Metas e orçamentos', body: 'Nas abas Metas e Orçamentos você cria objetivos, registra aportes e define limites mensais por categoria, com alertas quando estiver perto do limite.' },
    ],
  },
  {
    id: 'analise', route: '/ai-analysis', title: 'Análise IA', summary: 'Diagnóstico e conversas com o assistente.',
    steps: [
      { title: 'Indicadores e diagnóstico', body: 'Os indicadores são calculados pelo sistema. Ative o assistente e, se quiser, o envio do resumo financeiro para gerar um diagnóstico do mês.' },
      { title: 'Converse e organize', body: 'Faça perguntas sobre seus números ou sobre o site. Cada assunto pode ficar em uma conversa separada, que você renomeia, exclui ou retoma depois, inclusive pelo chat flutuante.' },
    ],
  },
  {
    id: 'analytics', route: '/analytics', title: 'Analytics', summary: 'Análises dos últimos seis meses.',
    steps: [
      { title: 'Receitas, despesas e categorias', body: 'Compare os meses e veja onde o dinheiro foi gasto. Transferências próprias, aplicações e faturas ficam fora dos totais.' },
      { title: 'Investimentos por origem', body: 'Carteiras cadastradas e investimentos importados aparecem separados, porque podem representar os mesmos ativos.' },
    ],
  },
  {
    id: 'simulacoes', route: '/simulations', title: 'Simulações', summary: 'Projete cenários com juros compostos.',
    steps: [
      { title: 'Monte dois cenários', body: 'Informe valor inicial, aporte mensal, prazo e uma taxa hipotética. O gráfico responde na hora a cada alteração.' },
      { title: 'Simule uma meta', body: 'Escolha uma meta para ver quanto guardar por mês até a data desejada e quanto tempo falta no ritmo atual. Simulações não garantem rendimento.' },
    ],
  },
  {
    id: 'integracoes', route: '/integracoes', title: 'Integrações', summary: 'Conecte instituições pelo Open Finance.',
    steps: [
      { title: 'Conecte uma instituição', body: '"Conectar banco" abre a janela oficial do Open Finance. A autorização acontece na própria instituição; o Wealth Advisor não pede nem guarda senhas.' },
      { title: 'Acompanhe cada conexão', body: 'Cada instituição mostra status, contas, movimentações importadas, investimentos e itens para revisar. Use Sincronizar, Reconectar ou Desvincular quando precisar.' },
    ],
  },
  {
    id: 'alertas', route: '/alerts', title: 'Alertas', summary: 'Avisos sobre orçamentos, metas, carteira e conexões.',
    steps: [
      { title: 'Avisos que importam', body: 'Os alertas são gerados quando você abre o app ou atualiza os dados: orçamento perto do limite, meta alcançada, concentração na carteira e conexões que precisam de atenção. Marque como lido quando resolver.' },
    ],
  },
];

const HL = highlights as Record<string, TutorialStep['highlight']>;

export const TUTORIALS: Tutorial[] = RAW.map((t) => ({
  ...t,
  steps: t.steps.map((s, i) => ({ ...s, image: `/tutorials/${t.id}-${i + 1}.jpg`, highlight: HL[`${t.id}-${i + 1}`] })),
}));

export function tutorialFor(pathname: string): Tutorial | undefined {
  return TUTORIALS.find((t) => pathname === t.route || pathname.startsWith(`${t.route}/`));
}
