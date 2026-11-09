package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	JWT         JWTConfig
	OpenAI      OpenAIConfig
	MarketData  MarketDataConfig
	Email       EmailConfig
	Webhook     WebhookConfig
}

type ServerConfig struct {
	Host         string
	Port         int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
	Environment  string
}

type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type JWTConfig struct {
	Secret          string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	Issuer          string
}

type OpenAIConfig struct {
	APIKey       string
	Model        string
	MaxTokens    int
	Temperature  float64
}

type MarketDataConfig struct {
	Provider        string
	AlphaVantageKey string
	TwelveDataKey   string
	CacheTTL        time.Duration
}

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

type WebhookConfig struct {
	DefaultURL string
	Timeout    time.Duration
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Host:         getEnv("SERVER_HOST", "0.0.0.0"),
			Port:         getEnvInt("SERVER_PORT", 8080),
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
			Environment:  getEnv("ENV", "development"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnvInt("DB_PORT", 5432),
			User:            getEnv("DB_USER", "postgres"),
			Password:        getEnv("DB_PASSWORD", "postgres"),
			DBName:          getEnv("DB_NAME", "ai_wealth_advisor"),
			SSLMode:         getEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:    25,
			MaxIdleConns:    5,
			ConnMaxLifetime: 5 * time.Minute,
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnvInt("REDIS_PORT", 6379),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       0,
		},
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", "[REDACTED]"),
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: 7 * 24 * time.Hour,
			Issuer:          "ai-wealth-advisor",
		},
		OpenAI: OpenAIConfig{
			APIKey:      getEnv("OPENAI_API_KEY", "[REDACTED]"),
			Model:       getEnv("OPENAI_MODEL", "gpt-4o"),
			MaxTokens:   getEnvInt("OPENAI_MAX_TOKENS", 4000),
			Temperature: getEnvFloat("OPENAI_TEMPERATURE", 0.3),
		},
		MarketData: MarketDataConfig{
			Provider:        getEnv("MARKET_DATA_PROVIDER", "yfinance"),
			AlphaVantageKey: getEnv("ALPHAVANTAGE_API_KEY", "[REDACTED]"),
			TwelveDataKey:   getEnv("TWELVEDATA_API_KEY", "[REDACTED]"),
			CacheTTL:        60 * time.Second,
		},
		Email: EmailConfig{
			SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
			SMTPPort:     getEnvInt("SMTP_PORT", 587),
			SMTPUser:     getEnv("SMTP_USER", "[REDACTED]"),
			SMTPPassword: getEnv("SMTP_PASSWORD", "[REDACTED]"),
			FromEmail:    getEnv("FROM_EMAIL", "noreply@aiwealthadvisor.com"),
			FromName:     getEnv("FROM_NAME", "AI Wealth Advisor"),
		},
		Webhook: WebhookConfig{
			DefaultURL: getEnv("WEBHOOK_URL", ""),
			Timeout:    10 * time.Second,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var result int
		fmt.Sscanf(value, "%d", &result)
		if result != 0 {
			return result
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		var result float64
		fmt.Sscanf(value, "%f", &result)
		if result != 0 {
			return result
		}
	}
	return defaultValue
}
