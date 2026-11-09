package auth

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email        string    `gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string    `gorm:"not null;size:255"`
	Name         string    `gorm:"not null;size:100"`
	RiskProfile  string    `gorm:"size:20;default:'moderado'"` // conservador, moderado, arrojado
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	
	// Relations
	Portfolios   []Portfolio `gorm:"foreignKey:UserID"`
	RefreshTokens []RefreshToken `gorm:"foreignKey:UserID"`
}

type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	Token     string    `gorm:"uniqueIndex;not null;size:500"`
	ExpiresAt time.Time `gorm:"not null"`
	CreatedAt time.Time
	Revoked   bool      `gorm:"default:false"`
	
	User User `gorm:"foreignKey:UserID"`
}

// Portfolio model (in portfolio package)
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
	
	User      User       `gorm:"foreignKey:UserID"`
	Positions []Position `gorm:"foreignKey:PortfolioID"`
}

func (User) TableName() string       { return "users" }
func (RefreshToken) TableName() string { return "refresh_tokens" }
func (Portfolio) TableName() string   { return "portfolios" }
