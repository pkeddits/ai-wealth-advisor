package transaction

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TransactionType string

const (
	TransactionTypeBuy        TransactionType = "buy"
	TransactionTypeSell       TransactionType = "sell"
	TransactionTypeDividend   TransactionType = "dividend"
	TransactionTypeInterest   TransactionType = "interest"
	TransactionTypeSplit      TransactionType = "split"
	TransactionTypeMerge      TransactionType = "merge"
	TransactionTypeBonus      TransactionType = "bonus"
	TransactionTypeSubscription TransactionType = "subscription"
)

type Transaction struct {
	ID            uuid.UUID         `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID   uuid.UUID         `gorm:"type:uuid;not null;index"`
	AssetID       uuid.UUID         `gorm:"type:uuid;not null;index"`
	Type          TransactionType   `gorm:"not null;size:20;index"`
	Date          time.Time         `gorm:"type:date;not null;index"`
	Quantity      float64           `gorm:"type:decimal(20,8);not null"`
	Price         float64           `gorm:"type:decimal(20,8);not null"`
	Fees          float64           `gorm:"type:decimal(20,8);default:0"`
	Taxes         float64           `gorm:"type:decimal(20,8);default:0"`
	TotalValue    float64           `gorm:"type:decimal(20,2)"`
	Notes         string            `gorm:"type:text"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
	Asset     Asset     `gorm:"foreignKey:AssetID"`
}

func (Transaction) TableName() string { return "transactions" }
