package simulation

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Simulation struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name            string    `gorm:"size:200" json:"name"`
	Description     string    `json:"description"`
	PortfolioID     uuid.UUID `gorm:"type:uuid;index" json:"portfolio_id"`
	Type            string    `gorm:"size:50" json:"type"` // monte_carlo, historical, stress_test
	Status          string    `gorm:"size:20;default:'pending'" json:"status"`
	Params          string    `gorm:"type:jsonb" json:"params"` // JSON config
	Results         string    `gorm:"type:jsonb" json:"results"` // JSON results
	ErrorMessage    string    `json:"error_message"`
	StartedAt       *time.Time `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (Simulation) TableName() string { return "simulations" }

type SimulationResult struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	SimulationID    uuid.UUID `gorm:"type:uuid;index" json:"simulation_id"`
	PathIndex       int       `json:"path_index"`
	FinalValue      float64   `json:"final_value"`
	MaxDrawdown     float64   `json:"max_drawdown"`
	MaxDrawdownDate string    `json:"max_drawdown_date"`
	Volatility      float64   `json:"volatility"`
	SharpeRatio     float64   `json:"sharpe_ratio"`
	Returns         string    `gorm:"type:jsonb" json:"returns"` // JSON array of daily returns
	Values          string    `gorm:"type:jsonb" json:"values"`  // JSON array of portfolio values
	CreatedAt       time.Time `json:"created_at"`
}

func (SimulationResult) TableName() string { return "simulation_results" }

type StressTestScenario struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string    `gorm:"size:200" json:"name"`
	Description string    `json:"description"`
	Shocks      string    `gorm:"type:jsonb" json:"shocks"` // JSON array of shocks
	CreatedAt   time.Time `json:"created_at"`
}

func (StressTestScenario) TableName() string { return "stress_test_scenarios" }

type Backtest struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name            string    `gorm:"size:200" json:"name"`
	PortfolioID     uuid.UUID `gorm:"type:uuid;index" json:"portfolio_id"`
	Strategy        string    `gorm:"type:jsonb" json:"strategy"` // JSON strategy config
	StartDate       time.Time `gorm:"type:date" json:"start_date"`
	EndDate         time.Time `gorm:"type:date" json:"end_date"`
	InitialCapital  float64   `json:"initial_capital"`
	FinalCapital    float64   `json:"final_capital"`
	TotalReturn     float64   `json:"total_return"`
	AnnualReturn    float64   `json:"annual_return"`
	Volatility      float64   `json:"volatility"`
	SharpeRatio     float64   `json:"sharpe_ratio"`
	SortinoRatio    float64   `json:"sortino_ratio"`
	MaxDrawdown     float64   `json:"max_drawdown"`
	CalmarRatio     float64   `json:"calmar_ratio"`
	WinRate         float64   `json:"win_rate"`
	ProfitFactor    float64   `json:"profit_factor"`
	Trades          int       `json:"trades"`
	BenchmarkReturn float64   `json:"benchmark_return"`
	Alpha           float64   `json:"alpha"`
	Beta            float64   `json:"beta"`
	Status          string    `gorm:"size:20;default:'pending'" json:"status"`
	ErrorMessage    string    `json:"error_message"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (Backtest) TableName() string { return "backtests" }
