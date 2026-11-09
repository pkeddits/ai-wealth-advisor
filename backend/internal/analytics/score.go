package analytics

import (
	"context"
	"math"

	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *Service) CalculatePortfolioScore(ctx context.Context, portfolioID uuid.UUID) (*PortfolioScore, error) {
	// Get risk metrics
	metrics, err := s.CalculateRiskMetrics(ctx, portfolioID)
	if err != nil {
		return nil, err
	}
	
	// Get positions for quality/momentum/value scoring
	positions, err := s.portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		return nil, err
	}
	
	// Diversification Score (0-100): Based on HHI and number of positions
	divScore := calculateDiversificationScore(metrics.ConcentrationHHI, len(positions))
	
	// Risk Score (0-100): Lower volatility/drawdown = higher score
	riskScore := calculateRiskScore(metrics.Volatility1y, metrics.MaxDrawdown, metrics.Var95)
	
	// Quality Score (0-100): Based on fundamentals of holdings
	qualityScore := calculateQualityScore(ctx, s, positions)
	
	// Momentum Score (0-100): Based on recent performance
	momentumScore := calculateMomentumScore(metrics)
	
	// Value Score (0-100): Based on valuation metrics
	valueScore := calculateValueScore(ctx, s, positions)
	
	// Weighted total score
	weights := map[string]float64{
		"diversification": 0.25,
		"risk":            0.25,
		"quality":         0.20,
		"momentum":        0.15,
		"value":           0.15,
	}
	
	totalScore := int(math.Round(
		float64(divScore)*weights["diversification"] +
		float64(riskScore)*weights["risk"] +
		float64(qualityScore)*weights["quality"] +
		float64(momentumScore)*weights["momentum"] +
		float64(valueScore)*weights["value"],
	))
	
	if totalScore > 100 {
		totalScore = 100
	}
	if totalScore < 0 {
		totalScore = 0
	}
	
	score := &PortfolioScore{
		PortfolioID:         portfolioID,
		Score:               totalScore,
		DiversificationScore: divScore,
		RiskScore:           riskScore,
		QualityScore:        qualityScore,
		MomentumScore:       momentumScore,
		ValueScore:          valueScore,
		CalculatedAt:        time.Now(),
	}
	
	// Save
	var existing PortfolioScore
	err = s.db.Where("portfolio_id = ?", portfolioID).First(&existing).Error
	if err == nil {
		score.ID = existing.ID
		score.CreatedAt = existing.CreatedAt
		s.db.Save(score)
	} else {
		s.db.Create(score)
	}
	
	return score, nil
}

func calculateDiversificationScore(hhi float64, numPositions int) int {
	// HHI: 0 = perfectly diversified, 10000 = concentrated
	// Convert to 0-100 score
	hhiScore := 100 - int(hhi/100)
	if hhiScore < 0 {
		hhiScore = 0
	}
	
	// Bonus for number of positions
	posBonus := 0
	if numPositions >= 20 {
		posBonus = 10
	} else if numPositions >= 10 {
		posBonus = 5
	} else if numPositions >= 5 {
		posBonus = 2
	}
	
	score := hhiScore + posBonus
	if score > 100 {
		score = 100
	}
	return score
}

func calculateRiskScore(vol1y, maxDD, var95 float64) int {
	// Lower is better for risk metrics
	// Volatility: <10% = 100, >40% = 0
	volScore := 100 - int(vol1y*2.5)
	if volScore < 0 {
		volScore = 0
	}
	
	// Max Drawdown: <10% = 100, >50% = 0
	ddScore := 100 - int(maxDD*2)
	if ddScore < 0 {
		ddScore = 0
	}
	
	// VaR 95: <2% = 100, >10% = 0
	varScore := 100 - int(var95*10)
	if varScore < 0 {
		varScore = 0
	}
	
	// Average
	return (volScore + ddScore + varScore) / 3
}

func calculateQualityScore(ctx context.Context, s *Service, positions []portfolio.Position) int {
	if len(positions) == 0 {
		return 50
	}
	
	totalScore := 0
	count := 0
	
	for _, pos := range positions {
		fund, err := s.assetService.GetFundamentals(ctx, pos.AssetID)
		if err != nil || fund == nil {
			continue
		}
		
		score := 50 // Base
		
		// ROE > 15% = good
		if fund.ROE > 15 {
			score += 10
		} else if fund.ROE > 10 {
			score += 5
		}
		
		// ROIC > 15% = good
		if fund.ROIC > 15 {
			score += 10
		} else if fund.ROIC > 10 {
			score += 5
		}
		
		// Debt/Equity < 0.5 = good
		if fund.DebtToEquity < 0.5 {
			score += 10
		} else if fund.DebtToEquity < 1.0 {
			score += 5
		}
		
		// Current Ratio > 1.5 = good
		if fund.CurrentRatio > 1.5 {
			score += 5
		}
		
		// Positive growth
		if fund.RevenueGrowth > 0 && fund.EarningsGrowth > 0 {
			score += 10
		}
		
		if score > 100 {
			score = 100
		}
		
		totalScore += score
		count++
	}
	
	if count == 0 {
		return 50
	}
	
	return totalScore / count
}

func calculateMomentumScore(metrics *RiskMetrics) int {
	// Based on recent returns (simplified)
	// This would use actual recent performance data
	return 50 // Placeholder
}

func calculateValueScore(ctx context.Context, s *Service, positions []portfolio.Position) int {
	if len(positions) == 0 {
		return 50
	}
	
	totalScore := 0
	count := 0
	
	for _, pos := range positions {
		fund, err := s.assetService.GetFundamentals(ctx, pos.AssetID)
		if err != nil || fund == nil {
			continue
		}
		
		score := 50
		
		// P/E: lower is better (for value)
		if fund.PE > 0 && fund.PE < 15 {
			score += 15
		} else if fund.PE > 0 && fund.PE < 25 {
			score += 5
		}
		
		// P/B: lower is better
		if fund.PB > 0 && fund.PB < 1.5 {
			score += 10
		} else if fund.PB > 0 && fund.PB < 3 {
			score += 5
		}
		
		// Dividend yield
		if fund.DividendYield > 4 {
			score += 10
		} else if fund.DividendYield > 2 {
			score += 5
		}
		
		if score > 100 {
			score = 100
		}
		
		totalScore += score
		count++
	}
	
	if count == 0 {
		return 50
	}
	
	return totalScore / count
}
