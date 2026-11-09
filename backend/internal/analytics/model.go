package analytics

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RiskMetrics struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID     uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	Volatility30d   float64   `gorm:"type:decimal(10,4)"`
	Volatility90d   float64   `gorm:"type:decimal(10,4)"`
	Volatility1y    float64   `gorm:"type:decimal(10,4)"`
	MaxDrawdown     float64   `gorm:"type:decimal(10,4)"`
	CurrentDrawdown float64   `gorm:"type:decimal(10,4)"`
	Var95           float64   `gorm:"type:decimal(10,4)"`
	Var99           float64   `gorm:"type:decimal(10,4)"`
	Beta            float64   `gorm:"type:decimal(10,4)"`
	SharpeRatio     float64   `gorm:"type:decimal(10,4)"`
	SortinoRatio    float64   `gorm:"type:decimal(10,4)"`
	ConcentrationHHI float64  `gorm:"type:decimal(10,4)"`
	Top5Concentration float64  `gorm:"type:decimal(10,4)"`
	Top10Concentration float64 `gorm:"type:decimal(10,4)"`
	CalculatedAt    time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
}

type PortfolioScore struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex"`
	Score         int       `gorm:"not null"` // 0-100
	DiversificationScore int  `gorm:"not null"`
	RiskScore     int       `gorm:"not null"`
	QualityScore  int       `gorm:"not null"`
	MomentumScore int       `gorm:"not null"`
	ValueScore    int       `gorm:"not null"`
	CalculatedAt  time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
}

type AssetScore struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AssetID       uuid.UUID `gorm:"type:uuid;not null;index"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Score         int       `gorm:"not null"`
	FundamentalScore int    `gorm:"not null"`
	TechnicalScore int      `gorm:"not null"`
	ValuationScore int      `gorm:"not null"`
	QualityScore   int      `gorm:"not null"`
	CalculatedAt   time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
	
	Asset     Asset     `gorm:"foreignKey:AssetID"`
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
}

type CorrelationMatrix struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;index"`
	AssetID1      uuid.UUID `gorm:"type:uuid;not null;index"`
	AssetID2      uuid.UUID `gorm:"type:uuid;not null;index"`
	Correlation   float64   `gorm:"type:decimal(10,4);not null"`
	PeriodDays    int       `gorm:"not null"`
	CalculatedAt  time.Time
	CreatedAt     time.Time
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
	Asset1    Asset     `gorm:"foreignKey:AssetID1"`
	Asset2    Asset     `gorm:"foreignKey:AssetID2"`
}

type MarketRegime string

const (
	MarketRegimeBull      MarketRegime = "bull"
	MarketRegimeBear      MarketRegime = "bear"
	MarketRegimeSideways  MarketRegime = "sideways"
	MarketRegimeHighVol   MarketRegime = "high_volatility"
	MarketRegimeLowVol    MarketRegime = "low_volatility"
	MarketRegimeCrisis    MarketRegime = "crisis"
	MarketRegimeRecovery  MarketRegime = "recovery"
)

type MarketRegimeData struct {
	ID            uuid.UUID    `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Regime        MarketRegime `gorm:"not null;size:20;index"`
	Confidence    float64      `gorm:"type:decimal(5,2)"`
	Indicators    string       `gorm:"type:jsonb"` // JSON with indicator values
	Description   string       `gorm:"type:text"`
	Date          time.Time    `gorm:"type:date;not null;index"`
	CreatedAt     time.Time
	
	// Unique constraint on date
	_ struct{} `gorm:"uniqueIndex:idx_market_regime_date"`
}

func (RiskMetrics) TableName() string        { return "risk_metrics" }
func (PortfolioScore) TableName() string     { return "portfolio_scores" }
func (AssetScore) TableName() string         { return "asset_scores" }
func (CorrelationMatrix) TableName() string  { return "correlation_matrices" }
func (MarketRegimeData) TableName() string   { return "market_regimes" }
