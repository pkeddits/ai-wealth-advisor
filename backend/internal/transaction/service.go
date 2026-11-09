package transaction

import (
	"context"
	"errors"

	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrTransactionNotFound = errors.New("transaction not found")
)

type Service struct {
	db           *gorm.DB
	portfolioSvc *portfolio.Service
}

func NewService(db *gorm.DB, portfolioSvc *portfolio.Service) *Service {
	return &Service{db: db, portfolioSvc: portfolioSvc}
}

func (s *Service) List(ctx context.Context, portfolioID uuid.UUID, assetID *uuid.UUID, txnType *TransactionType, limit, offset int) ([]Transaction, int64, error) {
	var txns []Transaction
	var total int64
	
	query := s.db.Where("portfolio_id = ?", portfolioID)
	
	if assetID != nil {
		query = query.Where("asset_id = ?", *assetID)
	}
	if txnType != nil {
		query = query.Where("type = ?", *txnType)
	}
	
	query.Count(&total)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Preload("Asset").Order("date DESC, created_at DESC").Find(&txns).Error
	return txns, total, err
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (*Transaction, error) {
	var t Transaction
	err := s.db.Preload("Asset").Preload("Portfolio").First(&t, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTransactionNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (s *Service) Create(ctx context.Context, t *Transaction) error {
	// Calculate total value
	t.TotalValue = t.Quantity * t.Price + t.Fees + t.Taxes
	
	// Start transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(t).Error; err != nil {
			return err
		}
		
		// Recalculate positions
		return s.portfolioSvc.RecalculatePositions(ctx, t.PortfolioID)
	})
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) (*Transaction, error) {
	var t Transaction
	if err := s.db.First(&t, id).Error; err != nil {
		return nil, ErrTransactionNotFound
	}
	
	// Recalculate total value if quantity or price changed
	if q, ok := updates["quantity"].(float64); ok {
		t.Quantity = q
	}
	if p, ok := updates["price"].(float64); ok {
		t.Price = p
	}
	if f, ok := updates["fees"].(float64); ok {
		t.Fees = f
	}
	if tx, ok := updates["taxes"].(float64); ok {
		t.Taxes = tx
	}
	t.TotalValue = t.Quantity * t.Price + t.Fees + t.Taxes
	
	if err := s.db.Model(&t).Updates(updates).Error; err != nil {
		return nil, err
	}
	
	// Recalculate positions
	if err := s.portfolioSvc.RecalculatePositions(ctx, t.PortfolioID); err != nil {
		return nil, err
	}
	
	return &t, nil
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	var t Transaction
	if err := s.db.First(&t, id).Error; err != nil {
		return ErrTransactionNotFound
	}
	
	portfolioID := t.PortfolioID
	
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&t).Error; err != nil {
			return err
		}
		return s.portfolioSvc.RecalculatePositions(ctx, portfolioID)
	})
}

func (s *Service) GetByPortfolio(ctx context.Context, portfolioID uuid.UUID) ([]Transaction, error) {
	var txns []Transaction
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Preload("Asset").
		Order("date ASC, created_at ASC").
		Find(&txns).Error
	return txns, err
}
