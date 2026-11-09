package sentiment

import (
	"context"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *Service) GetMarketSentimentHistory(ctx context.Context, days int) ([]MarketSentiment, error) {
	var sentiments []MarketSentiment
	err := s.db.Where("date >= ?", time.Now().AddDate(0, 0, -days)).
		Order("date ASC").
		Find(&sentiments).Error
	return sentiments, err
}

func (s *Service) GetAssetSentimentHistory(ctx context.Context, assetID uuid.UUID, days int) ([]AssetSentiment, error) {
	var sentiments []AssetSentiment
	err := s.db.Where("asset_id = ? AND date >= ?", assetID, time.Now().AddDate(0, 0, -days)).
		Order("date ASC").
		Find(&sentiments).Error
	return sentiments, err
}

func (s *Service) GetSentimentStats(ctx context.Context) (map[string]interface{}, error) {
	var latest MarketSentiment
	err := s.db.Order("date DESC").First(&latest).Error
	if err != nil {
		return nil, err
	}
	
	var avgScore float64
	s.db.Model(&MarketSentiment{}).
		Where("date >= ?", time.Now().AddDate(0, 0, -30)).
		Select("AVG(overall_score)").Scan(&avgScore)
	
	var avgFearGreed float64
	s.db.Model(&MarketSentiment{}).
		Where("date >= ?", time.Now().AddDate(0, 0, -30)).
		Select("AVG(fear_greed_index)").Scan(&avgFearGreed)
	
	return map[string]interface{}{
		"current":        latest,
		"avg_score_30d":  avgScore,
		"avg_fear_greed": avgFearGreed,
	}, nil
}
