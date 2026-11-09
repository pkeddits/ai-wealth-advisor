package portfolio

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Portfolio struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;index"`
	Name        string    `gorm:"not null;size:100"`
	Description string    `gorm:"type:text"`
	Currency    string    `gorm:"size:3;default:'BRL'"`
	IsArchived  bool      `gorm:"default:false"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	
	Positions []Position `gorm:"foreignKey:PortfolioID"`
}

type Position struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;index"`
	AssetID       uuid.UUID `gorm:"type:uuid;not null;index"`
	Quantity      float64   `gorm:"type:decimal(20,8);not null;default:0"`
	AveragePrice  float64   `gorm:"type:decimal(20,8);not null;default:0"`
	CurrentPrice  float64   `gorm:"type:decimal(20,8);default:0"`
	LastUpdated   time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
	Asset     Asset     `gorm:"foreignKey:AssetID"`
}

type PortfolioSnapshot struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Date          time.Time `gorm:"type:date;not null;index"`
	TotalValue    float64   `gorm:"type:decimal(20,2);not null"`
	DailyReturn   float64   `gorm:"type:decimal(10,4)"`
	TotalInvested float64   `gorm:"type:decimal(20,2)"`
	CreatedAt     time.Time
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
}

func (Portfolio) TableName() string       { return "portfolios" }
func (Position) TableName() string        { return "positions" }
func (PortfolioSnapshot) TableName() string { return "portfolio_snapshots" }
