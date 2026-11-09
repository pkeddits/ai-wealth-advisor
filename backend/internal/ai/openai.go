package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"ai-wealth-advisor/backend/internal/analytics"
	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/config"
	"ai-wealth-advisor/backend/internal/portfolio"
	"ai-wealth-advisor/backend/internal/sentiment"
	"github.com/google/uuid"
	"github.com/sashabaranov/go-openai"
	"gorm.io/gorm"
)

type Service struct {
	db            *gorm.DB
	client        *openai.Client
	config        *config.OpenAIConfig
	portfolioSvc  *portfolio.Service
	assetService  *asset.Service
	analyticsSvc  *analytics.Service
	sentimentSvc  *sentiment.Service
}

func NewService(db *gorm.DB, cfg *config.OpenAIConfig, portfolioSvc *portfolio.Service, assetSvc *asset.Service, analyticsSvc *analytics.Service, sentimentSvc *sentiment.Service) *Service {
	client := openai.NewClient(cfg.APIKey)
	return &Service{
		db:            db,
		client:        client,
		config:        cfg,
		portfolioSvc:  portfolioSvc,
		assetService:  assetSvc,
		analyticsSvc:  analyticsSvc,
		sentimentSvc:  sentimentSvc,
	}
}

type PortfolioContext struct {
	Portfolio      *portfolio.Portfolio
	Positions      []portfolio.Position
	RiskMetrics    *analytics.RiskMetrics
	PortfolioScore *analytics.PortfolioScore
	MarketRegime   *analytics.MarketRegimeData
	Sentiment      *sentiment.MarketSentiment
	News           []sentiment.NewsSentiment
}

func (s *Service) AnalyzePortfolio(ctx context.Context, portfolioID uuid.UUID) (*AIAnalysis, error) {
	startTime := time.Now()
	
	// Get portfolio context
	ctxData, err := s.buildContext(ctx, portfolioID)
	if err != nil {
		return nil, err
	}
	
	// Create analysis record
	analysis := &AIAnalysis{
		PortfolioID:  portfolioID,
		Status:       "pending",
		ModelVersion: s.config.Model,
	}
	s.db.Create(&analysis)
	
	// Build prompt
	prompt := s.buildAnalysisPrompt(ctxData)
	
	// Call OpenAI
	resp, err := s.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       s.config.Model,
		Messages:    []openai.ChatCompletionMessage{{Role: "user", Content: prompt}},
		MaxTokens:   s.config.MaxTokens,
		Temperature: s.config.Temperature,
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: "json_object",
		},
	})
	
	duration := time.Since(startTime).Milliseconds()
	
	if err != nil {
		analysis.Status = "failed"
		analysis.ErrorMessage = err.Error()
		s.db.Save(&analysis)
		
		// Audit log
		s.logAudit(ctx, analysis.ID, portfolioID, prompt, s.config.Model, "", "error", err.Error(), duration)
		return nil, err
	}
	
	content := resp.Choices[0].Message.Content
	
	// Parse response
	var result struct {
		Summary          string `json:"summary"`
		FullAnalysis     string `json:"full_analysis"`
		Recommendations  []struct {
			AssetID          string   `json:"asset_id"`
			Action           string   `json:"action"`
			Confidence       int      `json:"confidence"`
			CurrentWeight    float64  `json:"current_weight"`
			TargetWeight     float64  `json:"target_weight"`
			Reasoning        string   `json:"reasoning"`
			PositiveSignals  []string `json:"positive_signals"`
			NegativeSignals  []string `json:"negative_signals"`
			PortfolioImpact  string   `json:"portfolio_impact"`
			Priority         int      `json:"priority"`
		} `json:"recommendations"`
		Opportunities []struct {
			AssetID        string `json:"asset_id"`
			Reason         string `json:"reason"`
			FitScore       int    `json:"fit_score"`
			SuggestedWeight float64 `json:"suggested_weight"`
		} `json:"opportunities"`
	}
	
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		analysis.Status = "failed"
		analysis.ErrorMessage = "Failed to parse AI response: " + err.Error()
		s.db.Save(&analysis)
		s.logAudit(ctx, analysis.ID, portfolioID, prompt, s.config.Model, content, "error", err.Error(), duration)
		return nil, err
	}
	
	// Update analysis
	analysis.Status = "completed"
	analysis.Summary = result.Summary
	analysis.FullAnalysis = result.FullAnalysis
	analysis.PromptTokens = resp.Usage.PromptTokens
	analysis.CompletionTokens = resp.Usage.CompletionTokens
	analysis.TotalTokens = resp.Usage.TotalTokens
	completedAt := time.Now()
	analysis.CompletedAt = &completedAt
	s.db.Save(&analysis)
	
	// Save recommendations
	for _, rec := range result.Recommendations {
		assetID, _ := uuid.Parse(rec.AssetID)
		r := Recommendation{
			AnalysisID:     analysis.ID,
			AssetID:        assetID,
			Action:         RecommendationAction(rec.Action),
			Confidence:     rec.Confidence,
			CurrentWeight:  rec.CurrentWeight,
			TargetWeight:   rec.TargetWeight,
			Reasoning:      rec.Reasoning,
			PositiveSignals: toJSON(rec.PositiveSignals),
			NegativeSignals: toJSON(rec.NegativeSignals),
			PortfolioImpact: rec.PortfolioImpact,
			Priority:       rec.Priority,
		}
		s.db.Create(&r)
	}
	
	// Save opportunities
	for _, opp := range result.Opportunities {
		assetID, _ := uuid.Parse(opp.AssetID)
		o := Opportunity{
			AnalysisID:      analysis.ID,
			AssetID:         assetID,
			Reason:          opp.Reason,
			FitScore:        opp.FitScore,
			SuggestedWeight: opp.SuggestedWeight,
		}
		s.db.Create(&o)
	}
	
	// Audit log
	s.logAudit(ctx, analysis.ID, portfolioID, prompt, s.config.Model, content, "success", "", duration)
	
	return analysis, nil
}

func (s *Service) buildContext(ctx context.Context, portfolioID uuid.UUID) (*PortfolioContext, error) {
	p, err := s.portfolioSvc.Get(ctx, portfolioID, uuid.Nil)
	if err != nil {
		return nil, err
	}
	
	positions, err := s.portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		return nil, err
	}
	
	risk, _ := s.analyticsSvc.GetRiskMetrics(ctx, portfolioID)
	score, _ := s.analyticsSvc.GetPortfolioScore(ctx, portfolioID)
	regime, _ := s.analyticsSvc.GetMarketRegime(ctx)
	sent, _ := s.sentimentSvc.GetMarketSentiment(ctx)
	news, _ := s.sentimentSvc.GetRecentNews(ctx, 20)
	
	return &PortfolioContext{
		Portfolio:      p,
		Positions:      positions,
		RiskMetrics:    risk,
		PortfolioScore: score,
		MarketRegime:   regime,
		Sentiment:      sent,
		News:           news,
	}, nil
}

func (s *Service) buildAnalysisPrompt(ctx *PortfolioContext) string {
	var sb strings.Builder
	
	sb.WriteString("Você é um analista financeiro sênior especializado em gestão de patrimônio. ")
	sb.WriteString("Analise a carteira abaixo e forneça recomendações estruturadas em JSON.

")
	
	// Portfolio info
	sb.WriteString(fmt.Sprintf("CARTEIRA: %s (%s)
", ctx.Portfolio.Name, ctx.Portfolio.Currency))
	sb.WriteString(fmt.Sprintf("Patrimônio Total: R$ %.2f

", calculateTotalValue(ctx.Positions)))
	
	// Positions
	sb.WriteString("POSIÇÕES:
")
	for _, pos := range ctx.Positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		pct := 0.0
		total := calculateTotalValue(ctx.Positions)
		if total > 0 {
			pct = value / total * 100
		}
		pnl := value - pos.Quantity*pos.AveragePrice
		pnlPct := 0.0
		if pos.AveragePrice > 0 {
			pnlPct = (pos.CurrentPrice - pos.AveragePrice) / pos.AveragePrice * 100
		}
		sb.WriteString(fmt.Sprintf("- %s (%s): %.2f cotas @ R$ %.2f (PM: R$ %.2f) = R$ %.2f (%.1f%%) | P&L: R$ %.2f (%.2f%%)
",
			pos.Asset.Symbol, pos.Asset.Class, pos.Quantity, pos.CurrentPrice, pos.AveragePrice, value, pct, pnl, pnlPct))
	}
	
	// Risk metrics
	if ctx.RiskMetrics != nil {
		sb.WriteString(fmt.Sprintf("
MÉTRICAS DE RISCO:
"))
		sb.WriteString(fmt.Sprintf("- Volatilidade (1a): %.2f%%
", ctx.RiskMetrics.Volatility1y))
		sb.WriteString(fmt.Sprintf("- Max Drawdown: %.2f%%
", ctx.RiskMetrics.MaxDrawdown))
		sb.WriteString(fmt.Sprintf("- Drawdown Atual: %.2f%%
", ctx.RiskMetrics.CurrentDrawdown))
		sb.WriteString(fmt.Sprintf("- VaR 95%%: %.2f%%
", ctx.RiskMetrics.Var95))
		sb.WriteString(fmt.Sprintf("- Sharpe Ratio: %.2f
", ctx.RiskMetrics.SharpeRatio))
		sb.WriteString(fmt.Sprintf("- Concentração (HHI): %.0f
", ctx.RiskMetrics.ConcentrationHHI))
		sb.WriteString(fmt.Sprintf("- Top 5: %.1f%% | Top 10: %.1f%%
", ctx.RiskMetrics.Top5Concentration, ctx.RiskMetrics.Top10Concentration))
	}
	
	// Portfolio Score
	if ctx.PortfolioScore != nil {
		sb.WriteString(fmt.Sprintf("
PORTFOLIO SCORE: %d/100
", ctx.PortfolioScore.Score))
		sb.WriteString(fmt.Sprintf("- Diversificação: %d
", ctx.PortfolioScore.DiversificationScore))
		sb.WriteString(fmt.Sprintf("- Risco: %d
", ctx.PortfolioScore.RiskScore))
		sb.WriteString(fmt.Sprintf("- Qualidade: %d
", ctx.PortfolioScore.QualityScore))
		sb.WriteString(fmt.Sprintf("- Momentum: %d
", ctx.PortfolioScore.MomentumScore))
		sb.WriteString(fmt.Sprintf("- Valuation: %d
", ctx.PortfolioScore.ValueScore))
	}
	
	// Market Regime
	if ctx.MarketRegime != nil {
		sb.WriteString(fmt.Sprintf("
REGIME DE MERCADO: %s (Confiança: %.0f%%)
", ctx.MarketRegime.Regime, ctx.MarketRegime.Confidence))
		sb.WriteString(fmt.Sprintf("- Descrição: %s
", ctx.MarketRegime.Description))
	}
	
	// Sentiment
	if ctx.Sentiment != nil {
		sb.WriteString(fmt.Sprintf("
SENTIMENTO DE MERCADO: Score %.1f | Fear & Greed: %d
", ctx.Sentiment.OverallScore, ctx.Sentiment.FearGreedIndex))
	}
	
	// Recent news
	if len(ctx.News) > 0 {
		sb.WriteString("
NOTÍCIAS RECENTES:
")
		for _, n := range ctx.News[:5] {
			sb.WriteString(fmt.Sprintf("- [%s] %s (Sentimento: %s, Impacto: %.0f)
", n.Source, n.Title, n.Sentiment, n.Impact))
		}
	}
	
	sb.WriteString("
" + getAnalysisPrompt())
	
	return sb.String()
}

func calculateTotalValue(positions []portfolio.Position) float64 {
	total := 0.0
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		total += value
	}
	return total
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func getAnalysisPrompt() string {
	return `
INSTRUÇÕES:
Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "summary": "Resumo executivo da análise (2-3 frases)",
  "full_analysis": "Análise detalhada em linguagem natural",
  "recommendations": [
    {
      "asset_id": "uuid-do-asset",
      "action": "increase|hold|monitor|reduce|avoid|partial_sell",
      "confidence": 0-100,
      "current_weight": 0.0,
      "target_weight": 0.0,
      "reasoning": "Justificativa detalhada",
      "positive_signals": ["sinal 1", "sinal 2"],
      "negative_signals": ["risco 1", "risco 2"],
      "portfolio_impact": "Impacto na carteira se seguido",
      "priority": 1-10
    }
  ],
  "opportunities": [
    {
      "asset_id": "uuid-do-asset",
      "reason": "Por que é uma oportunidade",
      "fit_score": 0-100,
      "suggested_weight": 0.0
    }
  ]
}

REGRAS:
- action deve ser: increase, hold, monitor, reduce, avoid, partial_sell
- confidence NÃO é probabilidade de lucro, é confiança na análise
- Considere: risco da carteira, concentração, perfil do investidor, regime de mercado, fundamentos
- Seja conservador: evite recomendar "increase" em posições já concentradas
- Forneça pelo menos 1 recomendação por ativo na carteira
- Oportunidades: ativos FORA da carteira que se encaixam no perfil
`
}

func (s *Service) logAudit(ctx context.Context, analysisID, portfolioID uuid.UUID, prompt, model, response, status, errorMsg string, durationMs int64) {
	// Get input snapshot (simplified)
	inputSnapshot := map[string]interface{}{
		"portfolio_id": portfolioID.String(),
		"model":        model,
		"timestamp":    time.Now(),
	}
	inputJSON, _ := json.Marshal(inputSnapshot)
	
	audit := AuditLog{
		AnalysisID:    analysisID,
		PortfolioID:   portfolioID,
		InputSnapshot: string(inputJSON),
		Prompt:        prompt,
		ModelVersion:  model,
		Response:      response,
		Status:        status,
		ErrorMessage:  errorMsg,
		DurationMs:    durationMs,
	}
	s.db.Create(&audit)
}
