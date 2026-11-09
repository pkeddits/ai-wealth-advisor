package analytics

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *Service) CalculateAll(ctx context.Context, portfolioID uuid.UUID) error {
	// Calculate risk metrics
	_, err := s.CalculateRiskMetrics(ctx, portfolioID)
	if err != nil {
		return err
	}
	
	// Calculate portfolio score
	_, err = s.CalculatePortfolioScore(ctx, portfolioID)
	if err != nil {
		return err
	}
	
	// Calculate correlation matrix
	_, err = s.CalculateCorrelationMatrix(ctx, portfolioID, 252) // 1 year
	if err != nil {
		return err
	}
	
	// Calculate for shorter periods too
	s.CalculateCorrelationMatrix(ctx, portfolioID, 63)  // 3 months
	s.CalculateCorrelationMatrix(ctx, portfolioID, 21)  // 1 month
	
	return nil
}

func (s *Service) GetRiskMetrics(ctx context.Context, portfolioID uuid.UUID) (*RiskMetrics, error) {
	var metrics RiskMetrics
	err := s.db.Where("portfolio_id = ?", portfolioID).First(&metrics).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.CalculateRiskMetrics(ctx, portfolioID)
		}
		return nil, err
	}
	return &metrics, nil
}

func (s *Service) GetPortfolioScore(ctx context.Context, portfolioID uuid.UUID) (*PortfolioScore, error) {
	var score PortfolioScore
	err := s.db.Where("portfolio_id = ?", portfolioID).First(&score).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.CalculatePortfolioScore(ctx, portfolioID)
		}
		return nil, err
	}
	return &score, nil
}

func (s *Service) GetAssetScores(ctx context.Context, portfolioID uuid.UUID) ([]AssetScore, error) {
	var scores []AssetScore
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Preload("Asset").
		Find(&scores).Error
	return scores, err
}

func (s *Service) CalculateAssetScore(ctx context.Context, portfolioID, assetID uuid.UUID) (*AssetScore, error) {
	// Get fundamentals
	fund, err := s.assetService.GetFundamentals(ctx, assetID)
	if err != nil || fund == nil {
		return nil, err
	}
	
	// Fundamental score (0-100)
	fundScore := 50
	if fund.ROE > 15 { fundScore += 15 } else if fund.ROE > 10 { fundScore += 10 }
	if fund.ROIC > 15 { fundScore += 15 } else if fund.ROIC > 10 { fundScore += 10 }
	if fund.DebtToEquity < 0.5 { fundScore += 10 } else if fund.DebtToEquity < 1 { fundScore += 5 }
	if fund.CurrentRatio > 1.5 { fundScore += 5 }
	if fund.RevenueGrowth > 0 && fund.EarningsGrowth > 0 { fundScore += 10 }
	if fundScore > 100 { fundScore = 100 }
	
	// Technical score (placeholder)
	techScore := 50
	
	// Valuation score
	valScore := 50
	if fund.PE > 0 && fund.PE < 15 { valScore += 20 } else if fund.PE > 0 && fund.PE < 25 { valScore += 10 }
	if fund.PB > 0 && fund.PB < 1.5 { valScore += 15 } else if fund.PB > 0 && fund.PB < 3 { valScore += 5 }
	if fund.DividendYield > 4 { valScore += 10 } else if fund.DividendYield > 2 { valScore += 5 }
	if valScore > 100 { valScore = 100 }
	
	// Quality score
	qualScore := fundScore
	
	totalScore := int(float64(fundScore)*0.4 + float64(techScore)*0.2 + float64(valScore)*0.2 + float64(qualScore)*0.2)
	if totalScore > 100 { totalScore = 100 }
	
	score := &AssetScore{
		PortfolioID:      portfolioID,
		AssetID:          assetID,
		Score:            totalScore,
		FundamentalScore: fundScore,
		TechnicalScore:   techScore,
		ValuationScore:   valScore,
		QualityScore:     qualScore,
		CalculatedAt:     time.Now(),
	}
	
	// Save
	var existing AssetScore
	err = s.db.Where("portfolio_id = ? AND asset_id = ?", portfolioID, assetID).First(&existing).Error
	if err == nil {
		score.ID = existing.ID
		score.CreatedAt = existing.CreatedAt
		s.db.Save(score)
	} else {
		s.db.Create(score)
	}
	
	return score, nil
}

func (s *Service) GetMarketRegime(ctx context.Context) (*MarketRegimeData, error) {
	var regime MarketRegimeData
	err := s.db.Order("date DESC").First(&regime).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Return default
			return &MarketRegimeData{
				Regime:     MarketRegimeSideways,
				Confidence: 50,
				Date:       time.Now(),
			}, nil
		}
		return nil, err
	}
	return &regime, nil
}

func (s *Service) SetMarketRegime(ctx context.Context, regime MarketRegime, confidence float64, indicators string, description string) (*MarketRegimeData, error) {
	mr := &MarketRegimeData{
		Regime:      regime,
		Confidence:  confidence,
		Indicators:  indicators,
		Description: description,
		Date:        time.Now().Truncate(24 * time.Hour),
	}
	
	// Upsert
	var existing MarketRegimeData
	err := s.db.Where("date = ?", mr.Date).First(&existing).Error
	if err == nil {
		mr.ID = existing.ID
		mr.CreatedAt = existing.CreatedAt
		return mr, s.db.Save(mr).Error
	}
	return mr, s.db.Create(mr).Error
}
