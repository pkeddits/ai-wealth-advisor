package database

import (
	"fmt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"log"
	"time"

	"ai-wealth-advisor/backend/internal/config"
)

func NewPostgresDB(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	
	if err != nil {
		return nil, err
	}
	
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	
	if err := sqlDB.Ping(); err != nil {
		return nil, err
	}
	
	log.Println("Database connected successfully")
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&auth.User{},
		&auth.RefreshToken{},
		&asset.Asset{},
		&asset.Price{},
		&portfolio.Portfolio{},
		&portfolio.PortfolioAsset{},
		&transaction.Transaction{},
		&marketdata.MarketData{},
		&analytics.RiskMetrics{},
		&analytics.PortfolioScore{},
		&analytics.AssetScore{},
		&analytics.CorrelationMatrix{},
		&analytics.MarketRegimeData{},
		&ai.AIAnalysis{},
		&ai.Recommendation{},
		&ai.Opportunity{},
		&ai.AuditLog{},
		&sentiment.MarketSentiment{},
		&sentiment.NewsSentiment{},
		&sentiment.SocialSentiment{},
		&sentiment.AssetSentiment{},
		&simulation.Simulation{},
		&simulation.SimulationResult{},
		&simulation.StressTestScenario{},
		&simulation.Backtest{},
		&alert.Alert{},
		&alert.AlertTrigger{},
		&alert.NotificationPreference{},
	)
}
