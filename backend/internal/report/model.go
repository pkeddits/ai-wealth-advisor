package report

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReportType string

const (
	ReportTypeWeekly    ReportType = "weekly"
	ReportTypeMonthly   ReportType = "monthly"
	ReportTypeQuarterly ReportType = "quarterly"
	ReportTypeCustom    ReportType = "custom"
)

type ReportStatus string

const (
	ReportStatusPending   ReportStatus = "pending"
	ReportStatusGenerating ReportStatus = "generating"
	ReportStatusCompleted ReportStatus = "completed"
	ReportStatusFailed    ReportStatus = "failed"
)

type Report struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID `gorm:"type:uuid;not null;index"`
	PortfolioID   *uuid.UUID `gorm:"type:uuid;index"`
	Type          ReportType `gorm:"size:20;not null"`
	Status        ReportStatus `gorm:"size:20;default:'pending'"`
	Title         string    `gorm:"size:200"`
	PeriodStart   time.Time `gorm:"type:date;not null"`
	PeriodEnd     time.Time `gorm:"type:date;not null"`
	FilePath      string    `gorm:"size:500"`
	FileSize      int64
	Format        string    `gorm:"size:10;default:'pdf'"` // pdf, html, json
	ErrorMessage  string    `gorm:"type:text"`
	GeneratedAt   *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
	
	User      User      `gorm:"foreignKey:UserID"`
	Portfolio *Portfolio `gorm:"foreignKey:PortfolioID"`
}

type ReportSection struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ReportID    uuid.UUID `gorm:"type:uuid;not null;index"`
	SectionType string    `gorm:"size:50;not null"`
	Title       string    `gorm:"size:200"`
	Content     string    `gorm:"type:text"`
	Data        string    `gorm:"type:jsonb"`
	Order       int
	CreatedAt   time.Time
	
	Report Report `gorm:"foreignKey:ReportID"`
}

func (Report) TableName() string       { return "reports" }
func (ReportSection) TableName() string { return "report_sections" }
