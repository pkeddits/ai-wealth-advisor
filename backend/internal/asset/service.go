package asset

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrAssetNotFound = errors.New("asset not found")
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) List(ctx context.Context, class, country, search string, limit, offset int) ([]Asset, int64, error) {
	var assets []Asset
	var total int64
	
	query := s.db.Model(&Asset{}).Where("is_active = ?", true)
	
	if class != "" {
		query = query.Where("class = ?", class)
	}
	if country != "" {
		query = query.Where("country = ?", country)
	}
	if search != "" {
		searchLower := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(symbol) LIKE ? OR LOWER(name) LIKE ?", searchLower, searchLower)
	}
	
	query.Count(&total)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("symbol ASC").Find(&assets).Error
	return assets, total, err
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (*Asset, error) {
	var a Asset
	err := s.db.Preload("Fundamentals").Preload("Prices", func(db *gorm.DB) *gorm.DB {
		return db.Order("date DESC").Limit(30)
	}).First(&a, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (s *Service) GetBySymbol(ctx context.Context, symbol string) (*Asset, error) {
	var a Asset
	err := s.db.Where("symbol = ?", strings.ToUpper(symbol)).First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (s *Service) Create(ctx context.Context, a *Asset) error {
	a.Symbol = strings.ToUpper(a.Symbol)
	return s.db.Create(a).Error
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) (*Asset, error) {
	var a Asset
	if err := s.db.First(&a, id).Error; err != nil {
		return nil, ErrAssetNotFound
	}
	if err := s.db.Model(&a).Updates(updates).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.db.Delete(&Asset{}, id).Error
}

func (s *Service) Search(ctx context.Context, query string, limit int) ([]Asset, error) {
	var assets []Asset
	searchLower := "%" + strings.ToLower(query) + "%"
	err := s.db.Where("is_active = ? AND (LOWER(symbol) LIKE ? OR LOWER(name) LIKE ?)", true, searchLower, searchLower).
		Limit(limit).
		Order("symbol ASC").
		Find(&assets).Error
	return assets, err
}

func (s *Service) GetCurrentPrice(ctx context.Context, assetID uuid.UUID) (float64, error) {
	var price Price
	err := s.db.Where("asset_id = ?", assetID).Order("date DESC").First(&price).Error
	if err != nil {
		return 0, err
	}
	return price.Close, nil
}

func (s *Service) GetPriceHistory(ctx context.Context, assetID uuid.UUID, days int) ([]Price, error) {
	var prices []Price
	since := time.Now().AddDate(0, 0, -days)
	err := s.db.Where("asset_id = ? AND date >= ?", assetID, since).
		Order("date ASC").
		Find(&prices).Error
	return prices, err
}

func (s *Service) GetFundamentals(ctx context.Context, assetID uuid.UUID) (*Fundamentals, error) {
	var f Fundamentals
	err := s.db.Where("asset_id = ?", assetID).First(&f).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &f, nil
}

func (s *Service) UpdatePrice(ctx context.Context, assetID uuid.UUID, priceData Price) error {
	// Upsert price
	var existing Price
	err := s.db.Where("asset_id = ? AND date = ?", assetID, priceData.Date).First(&existing).Error
	if err == nil {
		priceData.ID = existing.ID
		return s.db.Save(&priceData).Error
	}
	return s.db.Create(&priceData).Error
}

func (s *Service) UpdateFundamentals(ctx context.Context, assetID uuid.UUID, f *Fundamentals) error {
	f.AssetID = assetID
	var existing Fundamentals
	err := s.db.Where("asset_id = ?", assetID).First(&existing).Error
	if err == nil {
		f.ID = existing.ID
		return s.db.Save(f).Error
	}
	return s.db.Create(f).Error
}
