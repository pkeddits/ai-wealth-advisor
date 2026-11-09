package sentiment

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MarketSentiment struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	OverallScore   float64   `json:"overall_score"`    // -100 to 100
	FearGreedIndex int       `json:"fear_greed_index"` // 0-100
	BullishPct     float64   `json:"bullish_pct"`
	BearishPct     float64   `json:"bearish_pct"`
	NeutralPct     float64   `json:"neutral_pct"`
	NewsCount      int       `json:"news_count"`
	SocialCount    int       `json:"social_count"`
	Date           time.Time `gorm:"type:date;uniqueIndex" json:"date"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (MarketSentiment) TableName() string { return "market_sentiments" }

type NewsSentiment struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string    `json:"title"`
	Summary     string    `json:"summary"`
	URL         string    `json:"url"`
	Source      string    `json:"source"`
	PublishedAt time.Time `json:"published_at"`
	Sentiment   string    `json:"sentiment"` // positive, negative, neutral
	Score       float64   `json:"score"`     // -1 to 1
	Impact      float64   `json:"impact"`    // 0-100
	Symbols     string    `gorm:"type:jsonb" json:"symbols"` // JSON array of symbols
	Language    string    `json:"language"`
	CreatedAt   time.Time `json:"created_at"`
}

func (NewsSentiment) TableName() string { return "news_sentiments" }

type SocialSentiment struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Platform    string    `json:"platform"` // twitter, reddit, stocktwits
	Author      string    `json:"author"`
	Content     string    `json:"content"`
	URL         string    `json:"url"`
	PostedAt    time.Time `json:"posted_at"`
	Sentiment   string    `json:"sentiment"`
	Score       float64   `json:"score"`
	Likes       int       `json:"likes"`
	Retweets    int       `json:"retweets"`
	Replies     int       `json:"replies"`
	Symbols     string    `gorm:"type:jsonb" json:"symbols"`
	CreatedAt   time.Time `json:"created_at"`
}

func (SocialSentiment) TableName() string { return "social_sentiments" }

type AssetSentiment struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	AssetID      uuid.UUID `gorm:"type:uuid;index" json:"asset_id"`
	OverallScore float64   `json:"overall_score"`
	NewsScore    float64   `json:"news_score"`
	SocialScore  float64   `json:"social_score"`
	NewsCount    int       `json:"news_count"`
	SocialCount  int       `json:"social_count"`
	BullishPct   float64   `json:"bullish_pct"`
	BearishPct   float64   `json:"bearish_pct"`
	Date         time.Time `gorm:"type:date;index" json:"date"`
	CreatedAt    time.Time `json:"created_at"`
	Asset        Asset     `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

func (AssetSentiment) TableName() string { return "asset_sentiments" }

type Asset struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Symbol       string    `gorm:"size:20;uniqueIndex" json:"symbol"`
	Name         string    `gorm:"size:200" json:"name"`
	Class        string    `gorm:"size:50" json:"class"`
	Sector       string    `gorm:"size:100" json:"sector"`
	Country      string    `gorm:"size:2;index" json:"country"`
	Exchange     string    `gorm:"size:50" json:"exchange"`
	Currency     string    `gorm:"size:3" json:"currency"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
