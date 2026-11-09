package ai

// Additional prompt templates for specific use cases

const RecommendationPrompt = `
Você é um consultor de investimentos. Baseado nos dados da carteira, gere recomendações por ativo.

Para CADA ativo na carteira, forneça:
1. Ação: increase, hold, monitor, reduce, avoid, partial_sell
2. Confiança (0-100): quão confiante você está na recomendação
3. Peso atual e alvo na carteira
4. Justificativa com sinais positivos e negativos
5. Impacto no portfólio

Critérios:
- Reduza concentração > 20% em um ativo
- Considere volatilidade, drawdown, correlação
- Alinhe com perfil de risco do investidor
- Regime de mercado bearish = mais cautela
- Fundamentos ruins = reduce/avoid
- Fundamentos bons + preço atrativo = increase
`

const OpportunityPrompt = `
Identifique 3-5 ativos FORA da carteira que se encaixam no perfil do investidor.

Critérios:
- Classe de ativo sub-representada na carteira
- Fundamentos sólidos (ROE > 15%, D/E < 1, crescimento positivo)
- Valuation atrativo (P/E < setor, P/B < 1.5)
- Liquidez adequada
- Correlação baixa com ativos existentes
`

const ExplanationPrompt = `
Explique em linguagem natural a recomendação para um investidor leigo.
Use analogias simples. Evite jargão técnico desnecessário.
Estruture: O que recomendamos -> Por que -> O que pode dar errado -> Próximos passos
`
