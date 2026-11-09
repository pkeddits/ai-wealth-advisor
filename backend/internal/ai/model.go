package ai

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RecommendationAction string

const (
	ActionIncrease       RecommendationAction = "increase"
	ActionHold           RecommendationAction = "hold"
	ActionMonitor        RecommendationAction = "monitor"
	ActionReduce         RecommendationAction = "reduce"
	ActionAvoid          RecommendationAction = "avoid"
	ActionPartialSell    RecommendationAction = "partial_sell"
)

type AIAnalysis struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Status        string    `gorm:"size:20;default:'pending'"` // pending, completed, failed
	Summary       string    `gorm:"type:text"`
	FullAnalysis  string    `gorm:"type:text"`
	ModelVersion  string    `gorm:"size:50"`
	PromptTokens  int
	CompletionTokens int
	TotalTokens   int
	ErrorMessage  string    `gorm:"type:text"`
	CreatedAt     time.Time
	CompletedAt   *time.Time
	
	Portfolio Portfolio `gorm:"foreignKey:PortfolioID"`
	Recommendations []Recommendation `gorm:"foreignKey:AnalysisID"`
}

type Recommendation struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AnalysisID    uuid.UUID `gorm:"type:uuid;not null;index"`
	AssetID       uuid.UUID `gorm:"type:uuid;not null;index"`
	Action        RecommendationAction `gorm:"not null;size:20"`
	Confidence    int       `gorm:"not null"` // 0-100
	CurrentWeight float64   `gorm:"type:decimal(10,4)"`
	TargetWeight  float64   `gorm:"type:decimal(10,4)"`
	Reasoning     string    `gorm:"type:text"`
	PositiveSignals string   `gorm:"type:jsonb"`
	NegativeSignals string   `gorm:"type:jsonb"`
	PortfolioImpact  string  `gorm:"type:text"`
	Priority      int       `gorm:"default:0"`
	CreatedAt     time.Time
	
	Analysis AIAnalysis `gorm:"foreignKey:AnalysisID"`
	Asset    Asset      `gorm:"foreignKey:AssetID"`
}

type Opportunity struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AnalysisID    uuid.UUID `gorm:"type:uuid;not null;index"`
	AssetID       uuid.UUID `gorm:"type:uuid;not null;index"`
	Reason        string    `gorm:"type:text"`
	FitScore      int       `gorm:"not null"` // 0-100
	SuggestedWeight float64 `gorm:"type:decimal(10,4)"`
	CreatedAt     time.Time
	
	Analysis AIAnalysis `gorm:"foreignKey:AnalysisID"`
	Asset    Asset      `gorm:"foreignKey:AssetID"`
}

type AuditLog struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AnalysisID    uuid.UUID `gorm:"type:uuid;not null;index"`
	PortfolioID   uuid.UUID `gorm:"type:uuid;not null;index"`
	InputSnapshot string    `gorm:"type:jsonb;not null"`
	Prompt        string    `gorm:"type:text;not null"`
	ModelVersion  string    `gorm:"size:50;not null"`
	Response      string    `gorm:"type:text"`
	Status        string    `gorm:"size:20;not null"` // success, error
	ErrorMessage  string    `gorm:"type:text"`
	DurationMs    int64
	CreatedAt     time.Time
}

func (AIAnalysis) TableName() string     { return "ai_analyses" }
func (Recommendation) TableName() string { return "recommendations" }
func (Opportunity) TableName() string    { return "opportunities" }
func (AuditLog) TableName() string       { return "audit_logs" }
