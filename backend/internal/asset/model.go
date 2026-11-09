package asset

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssetClass string

const (
	AssetClassStock     AssetClass = "stock"
	AssetClassFII       AssetClass = "fii"
	AssetClassFixedIncome AssetClass = "fixed_income"
	AssetClassCrypto    AssetClass = "crypto"
	AssetClassInternational AssetClass = "international"
	AssetClassETF       AssetClass = "etf"
	AssetClassBDR       AssetClass = "bdr"
)

type Asset struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Symbol       string     `gorm:"uniqueIndex;not null;size:20"`
	Name         string     `gorm:"not null;size:200"`
	Class        AssetClass `gorm:"not null;size:20;index"`
	Sector       string     `gorm:"size:100"`
	SubSector    string     `gorm:"size:100"`
	Country      string     `gorm:"size:2;default:'BR'"`
	Currency     string     `gorm:"size:3;default:'BRL'"`
	Exchange     string     `gorm:"size:20"`
	IsActive     bool       `gorm:"default:true;index"`
	Description  string     `gorm:"type:text"`
	LogoURL      string     `gorm:"size:500"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	
	Fundamentals *Fundamentals `gorm:"foreignKey:AssetID"`
	Prices       []Price       `gorm:"foreignKey:AssetID"`
}

type Fundamentals struct {
	ID                    uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AssetID               uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	MarketCap             float64   `gorm:"type:decimal(30,2)"`
	PE                    float64   `gorm:"type:decimal(10,2)"`
	PB                    float64   `gorm:"type:decimal(10,2)"`
	DividendYield         float64   `gorm:"type:decimal(10,4)"`
	ROE                   float64   `gorm:"type:decimal(10,2)"`
	ROIC                  float64   `gorm:"type:decimal(10,2)"`
	DebtToEquity          float64   `gorm:"type:decimal(10,2)"`
	CurrentRatio          float64   `gorm:"type:decimal(10,2)"`
	RevenueGrowth         float64   `gorm:"type:decimal(10,2)"`
	EarningsGrowth        float64   `gorm:"type:decimal(10,2)"`
	FreeCashFlowYield     float64   `gorm:"type:decimal(10,2)"`
	PayoutRatio           float64   `gorm:"type:decimal(10,2)"`
	Beta                  float64   `gorm:"type:decimal(10,4)"`
	SharesOutstanding     float64   `gorm:"type:decimal(30,0)"`
	LastUpdated           time.Time
	CreatedAt             time.Time
	
	Asset Asset `gorm:"foreignKey:AssetID"`
}

type Price struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AssetID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Date      time.Time `gorm:"type:date;not null;index"`
	Open      float64   `gorm:"type:decimal(20,8)"`
	High      float64   `gorm:"type:decimal(20,8)"`
	Low       float64   `gorm:"type:decimal(20,8)"`
	Close     float64   `gorm:"type:decimal(20,8);not null"`
	Volume    float64   `gorm:"type:decimal(30,0)"`
	AdjClose  float64   `gorm:"type:decimal(20,8)"`
	CreatedAt time.Time
	
	Asset Asset `gorm:"foreignKey:AssetID"`
}

type AssetPrice struct {
	Symbol    string  `json:"symbol"`
	Price     float64 `json:"price"`
	Change    float64 `json:"change"`
	ChangePct float64 `json:"change_pct"`
	Volume    float64 `json:"volume"`
	Timestamp int64   `json:"timestamp"`
	Source    string  `json:"source"`
}

func (Asset) TableName() string       { return "assets" }
func (Fundamentals) TableName() string { return "asset_fundamentals" }
func (Price) TableName() string        { return "asset_prices" }
