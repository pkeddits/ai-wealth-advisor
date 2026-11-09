package analytics

import (
	"context"

	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *Service) CalculateCorrelationMatrix(ctx context.Context, portfolioID uuid.UUID, periodDays int) ([]CorrelationMatrix, error) {
	positions, err := s.portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		return nil, err
	}
	
	if len(positions) < 2 {
		return []CorrelationMatrix{}, nil
	}
	
	// Get price history for each asset
	assetReturns := make(map[uuid.UUID][]float64)
	
	for _, pos := range positions {
		prices, err := s.assetService.GetPriceHistory(ctx, pos.AssetID, periodDays)
		if err != nil || len(prices) < 2 {
			continue
		}
		
		closePrices := make([]float64, len(prices))
		for i, p := range prices {
			closePrices[i] = p.Close
		}
		
		returns := CalculateReturns(closePrices)
		if len(returns) > 0 {
			assetReturns[pos.AssetID] = returns
		}
	}
	
	// Calculate pairwise correlations
	assetIDs := make([]uuid.UUID, 0, len(assetReturns))
	for id := range assetReturns {
		assetIDs = append(assetIDs, id)
	}
	
	var results []CorrelationMatrix
	for i := 0; i < len(assetIDs); i++ {
		for j := i + 1; j < len(assetIDs); j++ {
			corr := Correlation(assetReturns[assetIDs[i]], assetReturns[assetIDs[j]])
			
			cm := CorrelationMatrix{
				PortfolioID: portfolioID,
				AssetID1:    assetIDs[i],
				AssetID2:    assetIDs[j],
				Correlation: corr,
				PeriodDays:  periodDays,
				CalculatedAt: time.Now(),
			}
			results = append(results, cm)
			
			// Save to database
			var existing CorrelationMatrix
			err = s.db.Where("portfolio_id = ? AND asset_id1 = ? AND asset_id2 = ? AND period_days = ?",
				portfolioID, assetIDs[i], assetIDs[j], periodDays).First(&existing).Error
			if err == nil {
				cm.ID = existing.ID
				cm.CreatedAt = existing.CreatedAt
				s.db.Save(&cm)
			} else {
				s.db.Create(&cm)
			}
		}
	}
	
	return results, nil
}

func (s *Service) GetCorrelationMatrix(ctx context.Context, portfolioID uuid.UUID, periodDays int) ([]CorrelationMatrix, error) {
	var results []CorrelationMatrix
	err := s.db.Where("portfolio_id = ? AND period_days = ?", portfolioID, periodDays).
		Preload("Asset1").Preload("Asset2").
		Find(&results).Error
	return results, err
}
