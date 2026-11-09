package alert

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Alert struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	PortfolioID  uuid.UUID `gorm:"type:uuid;index" json:"portfolio_id"`
	AssetID      *uuid.UUID `gorm:"type:uuid;index" json:"asset_id,omitempty"`
	Name         string    `gorm:"size:200" json:"name"`
	Description  string    `json:"description"`
	Type         string    `gorm:"size:50" json:"type"` // price, percent_change, volume, rsi, macd, portfolio_value, drawdown, concentration, news_sentiment
	Condition    string    `gorm:"size:50" json:"condition"` // above, below, crosses_above, crosses_below, increase_by, decrease_by
	Threshold    float64   `json:"threshold"`
	Threshold2   float64   `json:"threshold2,omitempty"` // For range conditions
	Timeframe    string    `gorm:"size:20" json:"timeframe"` // 1m, 5m, 15m, 1h, 4h, 1d, 1w
	Enabled      bool      `gorm:"default:true" json:"enabled"`
	Cooldown     int       `json:"cooldown"` // Minutes between triggers
	LastTriggered *time.Time `json:"last_triggered,omitempty"`
	TriggerCount int       `json:"trigger_count"`
	NotifyEmail  bool      `gorm:"default:true" json:"notify_email"`
	NotifyPush   bool      `gorm:"default:false" json:"notify_push"`
	NotifyWebhook string   `json:"notify_webhook,omitempty"`
	Metadata     string    `gorm:"type:jsonb" json:"metadata,omitempty"` // Additional config
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Alert) TableName() string { return "alerts" }

type AlertTrigger struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	AlertID     uuid.UUID `gorm:"type:uuid;index" json:"alert_id"`
	Value       float64   `json:"value"`
	Message     string    `json:"message"`
	Data        string    `gorm:"type:jsonb" json:"data,omitempty"` // Snapshot of relevant data
	Acknowledged bool     `gorm:"default:false" json:"acknowledged"`
	AcknowledgedAt *time.Time `json:"acknowledged_at,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (AlertTrigger) TableName() string { return "alert_triggers" }

type NotificationPreference struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;uniqueIndex" json:"user_id"`
	EmailEnabled  bool      `gorm:"default:true" json:"email_enabled"`
	PushEnabled   bool      `gorm:"default:false" json:"push_enabled"`
	WebhookURL    string    `json:"webhook_url,omitempty"`
	EmailAlerts   bool      `gorm:"default:true" json:"email_alerts"`
	EmailDaily    bool      `gorm:"default:false" json:"email_daily"`
	EmailWeekly   bool      `gorm:"default:true" json:"email_weekly"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (NotificationPreference) TableName() string { return "notification_preferences" }
