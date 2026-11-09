package ai

import (
	"context"
	"encoding/json"
	
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *Service) GetRecommendations(ctx context.Context, portfolioID uuid.UUID) ([]Recommendation, error) {
	// Get latest analysis
	var analysis AIAnalysis
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Order("created_at DESC").
		First(&analysis).Error
	if err != nil {
		return nil, err
	}
	
	var recs []Recommendation
	err = s.db.Where("analysis_id = ?", analysis.ID).
		Preload("Asset").
		Order("priority DESC").
		Find(&recs).Error
	return recs, err
}

func (s *Service) GetOpportunities(ctx context.Context, portfolioID uuid.UUID) ([]Opportunity, error) {
	var analysis AIAnalysis
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Order("created_at DESC").
		First(&analysis).Error
	if err != nil {
		return nil, err
	}
	
	var opps []Opportunity
	err = s.db.Where("analysis_id = ?", analysis.ID).
		Preload("Asset").
		Order("fit_score DESC").
		Find(&opps).Error
	return opps, err
}

func (s *Service) GetLatestAnalysis(ctx context.Context, portfolioID uuid.UUID) (*AIAnalysis, error) {
	var analysis AIAnalysis
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Preload("Recommendations.Asset").
		Preload("Opportunities.Asset").
		Order("created_at DESC").
		First(&analysis).Error
	return &analysis, err
}

func (s *Service) GetAuditLogs(ctx context.Context, portfolioID uuid.UUID, limit int) ([]AuditLog, error) {
	var logs []AuditLog
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// Rule-based recommendation as fallback/hybrid
func (s *Service) GenerateRuleBasedRecommendations(ctx context.Context, portfolioID uuid.UUID) ([]Recommendation, error) {
	positions, err := s.portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		return nil, err
	}
	
	risk, _ := s.analyticsSvc.GetRiskMetrics(ctx, portfolioID)
	
	var recs []Recommendation
	totalValue := calculateTotalValue(positions)
	
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		weight := 0.0
		if totalValue > 0 {
			weight = value / totalValue * 100
		}
		
		action := RecommendationActionHold
		confidence := 60
		targetWeight := weight
		reasoning := "Manutenção baseada em regras automáticas"
		signals := []string{}
		negSignals := []string{}
		
		// Concentration check
		if weight > 20 {
			action = RecommendationActionReduce
			confidence = 80
			targetWeight = 15
			reasoning = "Posição concentrada (>20% da carteira). Reduzir para diversificar."
			negSignals = append(negSignals, "Concentração excessiva")
		} else if weight > 15 {
			action = RecommendationActionMonitor
			confidence = 70
			reasoning = "Posição com peso elevado. Monitorar para evitar concentração."
			negSignals = append(negSignals, "Peso elevado na carteira")
		}
		
		// Risk metrics
		if risk != nil {
			if risk.Volatility1y > 30 {
				if action == RecommendationActionHold {
					action = RecommendationActionMonitor
				}
				negSignals = append(negSignals, "Alta volatilidade do portfólio")
			}
			if risk.CurrentDrawdown > 15 {
				negSignals = append(negSignals, "Drawdown significativo atual")
			}
		}
		
		// P&L check
		pnlPct := 0.0
		if pos.AveragePrice > 0 {
			pnlPct = (pos.CurrentPrice - pos.AveragePrice) / pos.AveragePrice * 100
		}
		if pnlPct > 50 {
			signals = append(signals, "Valorização significativa (+50%)")
			if action == RecommendationActionHold {
				action = RecommendationActionPartialSell
				targetWeight = weight * 0.7
			}
		} else if pnlPct < -20 {
			negSignals = append(negSignals, "Desvalorização superior a 20%")
		}
		
		rec := Recommendation{
			AnalysisID:      uuid.Nil, // Not linked to AI analysis
			AssetID:         pos.AssetID,
			Action:          action,
			Confidence:      confidence,
			CurrentWeight:   weight,
			TargetWeight:    targetWeight,
			Reasoning:       reasoning,
			PositiveSignals: toJSON(signals),
			NegativeSignals: toJSON(negSignals),
			PortfolioImpact: "Redução de risco de concentração",
			Priority:        5,
		}
		recs = append(recs, rec)
	}
	
	return recs, nil
}
