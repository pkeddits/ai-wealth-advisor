package analytics

import (
	"context"
	"math"
	"sort"

	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	db            *gorm.DB
	portfolioSvc  *portfolio.Service
}

func NewService(db *gorm.DB, portfolioSvc *portfolio.Service) *Service {
	return &Service{db: db, portfolioSvc: portfolioSvc}
}

// CalculateReturns calculates daily returns from price series
func CalculateReturns(prices []float64) []float64 {
	if len(prices) < 2 {
		return []float64{}
	}
	returns := make([]float64, len(prices)-1)
	for i := 1; i < len(prices); i++ {
		if prices[i-1] > 0 {
			returns[i-1] = (prices[i] - prices[i-1]) / prices[i-1]
		}
	}
	return returns
}

// Volatility calculates annualized volatility
func Volatility(returns []float64, periodsPerYear int) float64 {
	if len(returns) < 2 {
		return 0
	}
	
	mean := 0.0
	for _, r := range returns {
		mean += r
	}
	mean /= float64(len(returns))
	
	variance := 0.0
	for _, r := range returns {
		diff := r - mean
		variance += diff * diff
	}
	variance /= float64(len(returns) - 1)
	
	return math.Sqrt(variance) * math.Sqrt(float64(periodsPerYear))
}

// MaxDrawdown calculates maximum drawdown from peak
func MaxDrawdown(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	
	peak := values[0]
	maxDD := 0.0
	
	for _, v := range values {
		if v > peak {
			peak = v
		}
		dd := (peak - v) / peak
		if dd > maxDD {
			maxDD = dd
		}
	}
	
	return maxDD * 100 // Return as percentage
}

// CurrentDrawdown calculates current drawdown from peak
func CurrentDrawdown(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	
	peak := values[0]
	for _, v := range values {
		if v > peak {
			peak = v
		}
	}
	
	current := values[len(values)-1]
	return (peak - current) / peak * 100
}

// VaR calculates Value at Risk at given confidence level
func VaR(returns []float64, confidence float64) float64 {
	if len(returns) == 0 {
		return 0
	}
	
	sorted := make([]float64, len(returns))
	copy(sorted, returns)
	sort.Float64s(sorted)
	
	index := int(float64(len(sorted)) * (1 - confidence))
	if index >= len(sorted) {
		index = len(sorted) - 1
	}
	if index < 0 {
		index = 0
	}
	
	return -sorted[index] * 100 // Return as positive percentage
}

// SharpeRatio calculates Sharpe ratio
func SharpeRatio(returns []float64, riskFreeRate float64, periodsPerYear int) float64 {
	if len(returns) < 2 {
		return 0
	}
	
	mean := 0.0
	for _, r := range returns {
		mean += r
	}
	mean /= float64(len(returns))
	
	vol := Volatility(returns, periodsPerYear) / 100 // Convert back to decimal
	if vol == 0 {
		return 0
	}
	
	excessReturn := mean*float64(periodsPerYear) - riskFreeRate
	return excessReturn / vol
}

// SortinoRatio calculates Sortino ratio (downside deviation)
func SortinoRatio(returns []float64, riskFreeRate float64, periodsPerYear int) float64 {
	if len(returns) < 2 {
		return 0
	}
	
	mean := 0.0
	for _, r := range returns {
		mean += r
	}
	mean /= float64(len(returns))
	
	downsideSum := 0.0
	downsideCount := 0
	for _, r := range returns {
		if r < 0 {
			downsideSum += r * r
			downsideCount++
		}
	}
	
	if downsideCount == 0 {
		return 0
	}
	
	downsideDev := math.Sqrt(downsideSum/float64(downsideCount)) * math.Sqrt(float64(periodsPerYear))
	if downsideDev == 0 {
		return 0
	}
	
	excessReturn := mean*float64(periodsPerYear) - riskFreeRate
	return excessReturn / downsideDev
}

// Correlation calculates Pearson correlation between two return series
func Correlation(returns1, returns2 []float64) float64 {
	n := len(returns1)
	if n != len(returns2) || n < 2 {
		return 0
	}
	
	sum1, sum2 := 0.0, 0.0
	for i := 0; i < n; i++ {
		sum1 += returns1[i]
		sum2 += returns2[i]
	}
	mean1 := sum1 / float64(n)
	mean2 := sum2 / float64(n)
	
	num, den1, den2 := 0.0, 0.0, 0.0
	for i := 0; i < n; i++ {
		d1 := returns1[i] - mean1
		d2 := returns2[i] - mean2
		num += d1 * d2
		den1 += d1 * d1
		den2 += d2 * d2
	}
	
	if den1 == 0 || den2 == 0 {
		return 0
	}
	
	return num / math.Sqrt(den1*den2)
}

// Beta calculates portfolio beta vs benchmark
func Beta(portfolioReturns, benchmarkReturns []float64) float64 {
	if len(portfolioReturns) != len(benchmarkReturns) || len(portfolioReturns) < 2 {
		return 1.0
	}
	
	cov := 0.0
	benchVar := 0.0
	benchMean := 0.0
	
	for _, r := range benchmarkReturns {
		benchMean += r
	}
	benchMean /= float64(len(benchmarkReturns))
	
	for i := 0; i < len(portfolioReturns); i++ {
		cov += (portfolioReturns[i] - benchMean) * (benchmarkReturns[i] - benchMean)
		benchVar += (benchmarkReturns[i] - benchMean) * (benchmarkReturns[i] - benchMean)
	}
	
	cov /= float64(len(portfolioReturns) - 1)
	benchVar /= float64(len(benchmarkReturns) - 1)
	
	if benchVar == 0 {
		return 1.0
	}
	
	return cov / benchVar
}

// HHI calculates Herfindahl-Hirschman Index for concentration
func HHI(weights []float64) float64 {
	sum := 0.0
	for _, w := range weights {
		sum += w * w
	}
	return sum * 10000 // Return as basis points (0-10000)
}

func (s *Service) CalculateRiskMetrics(ctx context.Context, portfolioID uuid.UUID) (*RiskMetrics, error) {
	// Get portfolio snapshots for returns calculation
	var snapshots []PortfolioSnapshot
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Order("date ASC").
		Find(&snapshots).Error
	if err != nil {
		return nil, err
	}
	
	if len(snapshots) < 2 {
		return &RiskMetrics{PortfolioID: portfolioID}, nil
	}
	
	// Calculate daily returns
	values := make([]float64, len(snapshots))
	for i, s := range snapshots {
		values[i] = s.TotalValue
	}
	
	returns := CalculateReturns(values)
	
	// Get positions for concentration
	positions, err := s.portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		return nil, err
	}
	
	// Calculate weights
	totalValue := 0.0
	weights := make([]float64, 0)
	assetWeights := make(map[uuid.UUID]float64)
	
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		totalValue += value
	}
	
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		if totalValue > 0 {
			w := value / totalValue
			weights = append(weights, w)
			assetWeights[pos.AssetID] = w
		}
	}
	
	// Calculate metrics
	metrics := &RiskMetrics{
		PortfolioID:       portfolioID,
		Volatility30d:     Volatility(lastN(returns, 30), 252),
		Volatility90d:     Volatility(lastN(returns, 90), 252),
		Volatility1y:      Volatility(returns, 252),
		MaxDrawdown:       MaxDrawdown(values),
		CurrentDrawdown:   CurrentDrawdown(values),
		Var95:             VaR(returns, 0.95),
		Var99:             VaR(returns, 0.99),
		SharpeRatio:       SharpeRatio(returns, 0.02, 252), // 2% risk-free
		SortinoRatio:      SortinoRatio(returns, 0.02, 252),
		ConcentrationHHI:  HHI(weights),
		CalculatedAt:      time.Now(),
	}
	
	// Top 5 and Top 10 concentration
	sortedWeights := make([]float64, len(weights))
	copy(sortedWeights, weights)
	sort.Sort(sort.Reverse(sort.Float64Slice(sortedWeights)))
	
	top5 := 0.0
	for i := 0; i < min(5, len(sortedWeights)); i++ {
		top5 += sortedWeights[i]
	}
	metrics.Top5Concentration = top5 * 100
	
	top10 := 0.0
	for i := 0; i < min(10, len(sortedWeights)); i++ {
		top10 += sortedWeights[i]
	}
	metrics.Top10Concentration = top10 * 100
	
	// Save to database
	var existing RiskMetrics
	err = s.db.Where("portfolio_id = ?", portfolioID).First(&existing).Error
	if err == nil {
		metrics.ID = existing.ID
		metrics.CreatedAt = existing.CreatedAt
		s.db.Save(metrics)
	} else {
		s.db.Create(metrics)
	}
	
	return metrics, nil
}

func lastN(slice []float64, n int) []float64 {
	if len(slice) <= n {
		return slice
	}
	return slice[len(slice)-n:]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
