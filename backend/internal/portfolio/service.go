package portfolio

import (
	"context"
	"errors"
	"time"

	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/transaction"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrPortfolioNotFound = errors.New("portfolio not found")
	ErrPositionNotFound  = errors.New("position not found")
)

type Service struct {
	db            *gorm.DB
	assetService  *asset.Service
	txnService    *transaction.Service
}

func NewService(db *gorm.DB, assetSvc *asset.Service, txnSvc *transaction.Service) *Service {
	return &Service{db: db, assetService: assetSvc, txnService: txnSvc}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]Portfolio, error) {
	var portfolios []Portfolio
	query := s.db.Where("user_id = ?", userID)
	if !includeArchived {
		query = query.Where("is_archived = ?", false)
	}
	err := query.Order("created_at DESC").Find(&portfolios).Error
	return portfolios, err
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, name, description, currency string) (*Portfolio, error) {
	if currency == "" {
		currency = "BRL"
	}
	p := Portfolio{
		UserID:      userID,
		Name:        name,
		Description: description,
		Currency:    currency,
	}
	if err := s.db.Create(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Service) Get(ctx context.Context, portfolioID, userID uuid.UUID) (*Portfolio, error) {
	var p Portfolio
	err := s.db.Where("id = ? AND user_id = ?", portfolioID, userID).
		Preload("Positions.Asset").
		First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPortfolioNotFound
		}
		return nil, err
	}
	
	// Update current prices for positions
	for i := range p.Positions {
		if price, err := s.assetService.GetCurrentPrice(ctx, p.Positions[i].AssetID); err == nil {
			p.Positions[i].CurrentPrice = price
			p.Positions[i].LastUpdated = time.Now()
		}
	}
	
	return &p, nil
}

func (s *Service) Update(ctx context.Context, portfolioID, userID uuid.UUID, name, description string, isArchived *bool) (*Portfolio, error) {
	var p Portfolio
	if err := s.db.Where("id = ? AND user_id = ?", portfolioID, userID).First(&p).Error; err != nil {
		return nil, ErrPortfolioNotFound
	}
	
	if name != "" {
		p.Name = name
	}
	if description != "" {
		p.Description = description
	}
	if isArchived != nil {
		p.IsArchived = *isArchived
	}
	
	if err := s.db.Save(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Service) Delete(ctx context.Context, portfolioID, userID uuid.UUID) error {
	result := s.db.Where("id = ? AND user_id = ?", portfolioID, userID).Delete(&Portfolio{})
	if result.RowsAffected == 0 {
		return ErrPortfolioNotFound
	}
	return result.Error
}

func (s *Service) GetPositions(ctx context.Context, portfolioID, userID uuid.UUID) ([]Position, error) {
	// Verify ownership
	var p Portfolio
	if err := s.db.Where("id = ? AND user_id = ?", portfolioID, userID).First(&p).Error; err != nil {
		return nil, ErrPortfolioNotFound
	}
	
	var positions []Position
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Preload("Asset").
		Find(&positions).Error
	
	// Update current prices
	for i := range positions {
		if price, err := s.assetService.GetCurrentPrice(ctx, positions[i].AssetID); err == nil {
			positions[i].CurrentPrice = price
			positions[i].LastUpdated = time.Now()
		}
	}
	
	return positions, err
}

func (s *Service) GetPerformance(ctx context.Context, portfolioID, userID uuid.UUID, days int) ([]PortfolioSnapshot, error) {
	// Verify ownership
	var p Portfolio
	if err := s.db.Where("id = ? AND user_id = ?", portfolioID, userID).First(&p).Error; err != nil {
		return nil, ErrPortfolioNotFound
	}
	
	var snapshots []PortfolioSnapshot
	since := time.Now().AddDate(0, 0, -days)
	err := s.db.Where("portfolio_id = ? AND date >= ?", portfolioID, since).
		Order("date ASC").
		Find(&snapshots).Error
	return snapshots, err
}

func (s *Service) GetAllocation(ctx context.Context, portfolioID, userID uuid.UUID) (map[string]float64, error) {
	positions, err := s.GetPositions(ctx, portfolioID, userID)
	if err != nil {
		return nil, err
	}
	
	totalValue := 0.0
	allocation := make(map[string]float64)
	
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		totalValue += value
		allocation[pos.Asset.Class] += value
	}
	
	// Convert to percentages
	for k, v := range allocation {
		if totalValue > 0 {
			allocation[k] = (v / totalValue) * 100
		}
	}
	
	return allocation, nil
}

func (s *Service) RecalculatePositions(ctx context.Context, portfolioID uuid.UUID) error {
	// Get all transactions for this portfolio
	txns, err := s.txnService.GetByPortfolio(ctx, portfolioID)
	if err != nil {
		return err
	}
	
	// Calculate positions from transactions
	positions := make(map[uuid.UUID]*Position)
	
	for _, txn := range txns {
		pos, exists := positions[txn.AssetID]
		if !exists {
			pos = &Position{
				PortfolioID:  portfolioID,
				AssetID:      txn.AssetID,
				Quantity:     0,
				AveragePrice: 0,
			}
			positions[txn.AssetID] = pos
		}
		
		switch txn.Type {
		case transaction.TransactionTypeBuy:
			// Update average price
			totalCost := pos.Quantity*pos.AveragePrice + txn.Quantity*txn.Price + txn.Fees
			pos.Quantity += txn.Quantity
			if pos.Quantity > 0 {
				pos.AveragePrice = totalCost / pos.Quantity
			}
		case transaction.TransactionTypeSell:
			pos.Quantity -= txn.Quantity
			if pos.Quantity <= 0 {
				pos.Quantity = 0
				pos.AveragePrice = 0
			}
		case transaction.TransactionTypeDividend, transaction.TransactionTypeInterest:
			// These don't affect position quantity
		}
	}
	
	// Save positions
	for _, pos := range positions {
		if pos.Quantity > 0 {
			// Upsert
			var existing Position
			err := s.db.Where("portfolio_id = ? AND asset_id = ?", portfolioID, pos.AssetID).First(&existing).Error
			if err == nil {
				pos.ID = existing.ID
				pos.CreatedAt = existing.CreatedAt
				s.db.Save(pos)
			} else {
				s.db.Create(pos)
			}
		} else {
			// Remove zero positions
			s.db.Where("portfolio_id = ? AND asset_id = ?", portfolioID, pos.AssetID).Delete(&Position{})
		}
	}
	
	return nil
}

func (s *Service) CreateSnapshot(ctx context.Context, portfolioID uuid.UUID) error {
	positions, err := s.GetPositions(ctx, portfolioID, uuid.Nil) // userID not needed here
	if err != nil {
		return err
	}
	
	totalValue := 0.0
	totalInvested := 0.0
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		totalValue += value
		totalInvested += pos.Quantity * pos.AveragePrice
	}
	
	// Get previous snapshot for daily return
	var prev PortfolioSnapshot
	s.db.Where("portfolio_id = ?", portfolioID).Order("date DESC").First(&prev)
	
	dailyReturn := 0.0
	if prev.TotalValue > 0 {
		dailyReturn = ((totalValue - prev.TotalValue) / prev.TotalValue) * 100
	}
	
	snapshot := PortfolioSnapshot{
		PortfolioID:   portfolioID,
		Date:          time.Now().Truncate(24 * time.Hour),
		TotalValue:    totalValue,
		DailyReturn:   dailyReturn,
		TotalInvested: totalInvested,
	}
	
	return s.db.Create(&snapshot).Error
}
