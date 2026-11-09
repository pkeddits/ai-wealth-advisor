package simulation

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"time"

	"ai-wealth-advisor/backend/internal/analytics"
	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StrategyConfig struct {
	RebalanceFreq     int                    `json:"rebalance_freq"`      // days
	TargetWeights     map[string]float64     `json:"target_weights"`      // asset_id -> weight
	Threshold         float64                `json:"threshold"`           // rebalance threshold %
	StopLoss          float64                `json:"stop_loss"`           // % stop loss
	TakeProfit        float64                `json:"take_profit"`         // % take profit
	MaxPositionSize   float64                `json:"max_position_size"`   // max % per position
	CashBuffer        float64                `json:"cash_buffer"`         // % to keep as cash
}

func RunBacktest(ctx context.Context, db *gorm.DB, portfolioSvc *portfolio.Service, portfolioID uuid.UUID, config StrategyConfig, startDate, endDate time.Time) (*Backtest, error) {
	bt := &Backtest{
		Name:           "Backtest - " + time.Now().Format("2006-01-02"),
		PortfolioID:    portfolioID,
		StartDate:      startDate,
		EndDate:        endDate,
		InitialCapital: 100000,
		Status:         "running",
	}
	stratJSON, _ := json.Marshal(config)
	bt.Strategy = string(stratJSON)
	db.Create(&bt)
	
	positions, err := portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		bt.Status = "failed"
		bt.ErrorMessage = err.Error()
		db.Save(bt)
		return bt, err
	}
	
	// Get price history for all assets
	assetPrices := make(map[uuid.UUID][]PricePoint)
	allDates := make(map[string]bool)
	
	for _, pos := range positions {
		prices, err := portfolioSvc.GetPriceHistoryRange(ctx, pos.AssetID, startDate, endDate)
		if err != nil {
			continue
		}
		
		points := make([]PricePoint, len(prices))
		for i, p := range prices {
			points[i] = PricePoint{Date: p.Date, Close: p.Close}
			allDates[p.Date.Format("2006-01-02")] = true
		}
		assetPrices[pos.AssetID] = points
	}
	
	// Create sorted date list
	dates := make([]string, 0, len(allDates))
	for d := range allDates { dates = append(dates, d) }
	sort.Strings(dates)
	
	if len(dates) < 2 {
		bt.Status = "failed"
		bt.ErrorMessage = "Insufficient price data"
		db.Save(bt)
		return bt, nil
	}
	
	// Simulate portfolio
	cash := bt.InitialCapital * config.CashBuffer
	invested := bt.InitialCapital - cash
	holdings := make(map[uuid.UUID]float64) // asset_id -> quantity
	
	// Initial allocation
	for _, pos := range positions {
		targetW := config.TargetWeights[pos.AssetID.String()]
		if targetW == 0 {
			// Equal weight default
			targetW = 1.0 / float64(len(positions))
		}
		alloc := invested * targetW
		if pos.CurrentPrice > 0 {
			holdings[pos.AssetID] = alloc / pos.CurrentPrice
		}
	}
	
	portfolioValues := make([]float64, len(dates))
	dailyReturns := make([]float64, 0, len(dates))
	trades := 0
	
	for i, dateStr := range dates {
		date, _ := time.Parse("2006-01-02", dateStr)
		
		// Calculate portfolio value
		value := cash
		for id, qty := range holdings {
			if prices, ok := assetPrices[id]; ok {
				for _, p := range prices {
					if p.Date.Equal(date) {
						value += qty * p.Close
						break
					}
				}
			}
		}
		
		portfolioValues[i] = value
		
		if i > 0 {
			ret := (value - portfolioValues[i-1]) / portfolioValues[i-1]
			dailyReturns = append(dailyReturns, ret)
		}
		
		// Check rebalance
		if config.RebalanceFreq > 0 && i > 0 && i % config.RebalanceFreq == 0 {
			// Rebalance logic here
			trades++
		}
		
		// Stop loss / take profit checks would go here
	}
	
	bt.FinalCapital = portfolioValues[len(portfolioValues)-1]
	bt.TotalReturn = (bt.FinalCapital - bt.InitialCapital) / bt.InitialCapital * 100
	
	// Annualized return
	years := endDate.Sub(startDate).Hours() / 24 / 365
	if years > 0 {
		bt.AnnualReturn = (math.Pow(bt.FinalCapital/bt.InitialCapital, 1/years) - 1) * 100
	}
	
	// Volatility
	if len(dailyReturns) > 1 {
		bt.Volatility = analytics.Volatility(dailyReturns, 252)
	}
	
	// Sharpe
	if len(dailyReturns) > 1 {
		bt.SharpeRatio = analytics.SharpeRatio(dailyReturns, 0.02, 252)
		bt.SortinoRatio = analytics.SortinoRatio(dailyReturns, 0.02, 252)
	}
	
	// Max Drawdown
	bt.MaxDrawdown = analytics.MaxDrawdown(portfolioValues)
	if bt.MaxDrawdown > 0 {
		bt.CalmarRatio = bt.AnnualReturn / bt.MaxDrawdown
	}
	
	// Win rate
	wins := 0
	grossProfit := 0.0
	grossLoss := 0.0
	for _, r := range dailyReturns {
		if r > 0 {
			wins++
			grossProfit += r
		} else {
			grossLoss += math.Abs(r)
		}
	}
	if len(dailyReturns) > 0 {
		bt.WinRate = float64(wins) / float64(len(dailyReturns)) * 100
	}
	if grossLoss > 0 {
		bt.ProfitFactor = grossProfit / grossLoss
	}
	
	bt.Trades = trades
	bt.Status = "completed"
	db.Save(bt)
	
	return bt, nil
}

type PricePoint struct {
	Date  time.Time
	Close float64
}
