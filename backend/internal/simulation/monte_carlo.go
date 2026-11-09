package simulation

import (
	"context"
	"encoding/json"
	"math"
	"math/rand"
	"sort"
	"time"

	"ai-wealth-advisor/backend/internal/analytics"
	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MonteCarloParams struct {
	NumPaths       int     `json:"num_paths"`        // Number of simulation paths
	TimeHorizon    int     `json:"time_horizon"`     // Days to simulate
	ConfidenceLevel float64 `json:"confidence_level"` // e.g., 0.95
	InitialValue   float64 `json:"initial_value"`
	MonthlyContribution float64 `json:"monthly_contribution"`
	RebalanceFreq  int     `json:"rebalance_freq"`   // Days between rebalancing
	RiskFreeRate   float64 `json:"risk_free_rate"`
}

type MonteCarloResult struct {
	Percentiles    map[string]float64 `json:"percentiles"` // p5, p10, p25, p50, p75, p90, p95
	MeanFinalValue float64            `json:"mean_final_value"`
	MedianFinalValue float64          `json:"median_final_value"`
	StdDev         float64            `json:"std_dev"`
	ProbLoss       float64            `json:"prob_loss"`       // Probability of loss
	ProbBeatBenchmark float64         `json:"prob_beat_benchmark"`
	Var95          float64            `json:"var_95"`
	ExpectedShortfall float64         `json:"expected_shortfall"`
	MaxDrawdownDist map[string]float64 `json:"max_drawdown_dist"`
	Paths          []PathSummary      `json:"paths"` // Sample of paths for visualization
}

type PathSummary struct {
	FinalValue    float64   `json:"final_value"`
	MaxDrawdown   float64   `json:"max_drawdown"`
	Volatility    float64   `json:"volatility"`
	SharpeRatio   float64   `json:"sharpe_ratio"`
	Returns       []float64 `json:"returns"`
	Values        []float64 `json:"values"`
}

func RunMonteCarlo(ctx context.Context, db *gorm.DB, portfolioSvc *portfolio.Service, analyticsSvc *analytics.Service, portfolioID uuid.UUID, params MonteCarloParams) (*Simulation, *MonteCarloResult, error) {
	// Create simulation record
	sim := &Simulation{
		Name:        "Monte Carlo - " + time.Now().Format("2006-01-02 15:04"),
		PortfolioID: portfolioID,
		Type:        "monte_carlo",
		Status:      "running",
	}
	paramsJSON, _ := json.Marshal(params)
	sim.Params = string(paramsJSON)
	
	now := time.Now()
	sim.StartedAt = &now
	db.Create(&sim)
	
	// Get portfolio positions and historical returns
	positions, err := portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		sim.Status = "failed"
		sim.ErrorMessage = err.Error()
		db.Save(sim)
		return sim, nil, err
	}
	
	if len(positions) == 0 {
		sim.Status = "failed"
		sim.ErrorMessage = "No positions in portfolio"
		db.Save(sim)
		return sim, nil, nil
	}
	
	// Build return series for each asset
	assetReturns := make(map[uuid.UUID][]float64)
	weights := make(map[uuid.UUID]float64)
	totalValue := params.InitialValue
	
	if totalValue == 0 {
		for _, pos := range positions {
			v := pos.Quantity * pos.CurrentPrice
			if v <= 0 { v = pos.Quantity * pos.AveragePrice }
			totalValue += v
		}
	}
	
	for _, pos := range positions {
		v := pos.Quantity * pos.CurrentPrice
		if v <= 0 { v = pos.Quantity * pos.AveragePrice }
		weights[pos.AssetID] = v / totalValue
		
		prices, err := portfolioSvc.GetPriceHistory(ctx, pos.AssetID, 252)
		if err != nil || len(prices) < 2 {
			// Use default volatility
			assetReturns[pos.AssetID] = []float64{0.0005} // ~12% annual
			continue
		}
		
		closePrices := make([]float64, len(prices))
		for i, p := range prices {
			closePrices[i] = p.Close
		}
		assetReturns[pos.AssetID] = analytics.CalculateReturns(closePrices)
	}
	
	// Calculate portfolio statistics
	meanReturns := make(map[uuid.UUID]float64)
	covMatrix := make(map[uuid.UUID]map[uuid.UUID]float64)
	
	ids := make([]uuid.UUID, 0, len(assetReturns))
	for id := range assetReturns {
		ids = append(ids, id)
	}
	
	for _, id := range ids {
		rets := assetReturns[id]
		if len(rets) == 0 {
			meanReturns[id] = 0.0005
			continue
		}
		sum := 0.0
		for _, r := range rets { sum += r }
		meanReturns[id] = sum / float64(len(rets))
	}
	
	// Covariance matrix
	for _, id1 := range ids {
		covMatrix[id1] = make(map[uuid.UUID]float64)
		for _, id2 := range ids {
			if id1 == id2 {
				// Variance
				rets := assetReturns[id1]
				if len(rets) < 2 {
					covMatrix[id1][id2] = 0.0001
					continue
				}
				mean := meanReturns[id1]
				varSum := 0.0
				for _, r := range rets {
					d := r - mean
					varSum += d * d
				}
				covMatrix[id1][id2] = varSum / float64(len(rets)-1)
			} else {
				r1 := assetReturns[id1]
				r2 := assetReturns[id2]
				n := min(len(r1), len(r2))
				if n < 2 {
					covMatrix[id1][id2] = 0
					continue
				}
				m1 := meanReturns[id1]
				m2 := meanReturns[id2]
				cov := 0.0
				for i := 0; i < n; i++ {
					cov += (r1[i] - m1) * (r2[i] - m2)
				}
				covMatrix[id1][id2] = cov / float64(n-1)
			}
		}
	}
	
	// Portfolio mean and variance
	portMean := 0.0
	portVar := 0.0
	for _, id1 := range ids {
		w1 := weights[id1]
		portMean += w1 * meanReturns[id1]
		for _, id2 := range ids {
			w2 := weights[id2]
			portVar += w1 * w2 * covMatrix[id1][id2]
		}
	}
	
	portStd := math.Sqrt(portVar)
	
	// Run simulations
	numPaths := params.NumPaths
	if numPaths == 0 { numPaths = 500 }
	horizon := params.TimeHorizon
	if horizon == 0 { horizon = 252 }
	confLevel := params.ConfidenceLevel
	if confLevel == 0 { confLevel = 0.95 }
	
	allFinalValues := make([]float64, numPaths)
	allMaxDD := make([]float64, numPaths)
	allVol := make([]float64, numPaths)
	allSharpe := make([]float64, numPaths)
	samplePaths := make([]PathSummary, 0, min(20, numPaths))
	
	for path := 0; path < numPaths; path++ {
		value := params.InitialValue
		if value == 0 { value = totalValue }
		
		pathReturns := make([]float64, horizon)
		pathValues := make([]float64, horizon)
		peak := value
		maxDD := 0.0
		
		for day := 0; day < horizon; day++ {
			// Generate correlated random returns (simplified: use portfolio-level)
			dailyReturn := rand.NormFloat64()*portStd + portMean
			
			// Add monthly contribution
			if day > 0 && day % 21 == 0 {
				value += params.MonthlyContribution
			}
			
			value *= (1 + dailyReturn)
			
			pathReturns[day] = dailyReturn
			pathValues[day] = value
			
			if value > peak {
				peak = value
			}
			dd := (peak - value) / peak
			if dd > maxDD {
				maxDD = dd
			}
		}
		
		allFinalValues[path] = value
		allMaxDD[path] = maxDD
		
		// Path volatility
		pathMeanRet := 0.0
		for _, r := range pathReturns { pathMeanRet += r }
		pathMeanRet /= float64(horizon)
		
		pathVar := 0.0
		for _, r := range pathReturns {
			d := r - pathMeanRet
			pathVar += d * d
		}
		pathVar /= float64(horizon - 1)
		pathStd := math.Sqrt(pathVar)
		allVol[path] = pathStd * math.Sqrt(252)
		
		// Path Sharpe
		rf := params.RiskFreeRate / 252
		if pathStd > 0 {
			allSharpe[path] = (pathMeanRet - rf) * 252 / (pathStd * math.Sqrt(252))
		}
		
		// Save sample paths
		if path < 20 {
			samplePaths = append(samplePaths, PathSummary{
				FinalValue:  value,
				MaxDrawdown: maxDD * 100,
				Volatility:  pathStd * math.Sqrt(252) * 100,
				SharpeRatio: allSharpe[path],
				Returns:     pathReturns,
				Values:      pathValues,
			})
		}
	}
	
	// Calculate percentiles
	sort.Float64s(allFinalValues)
	sort.Float64s(allMaxDD)
	sort.Float64s(allVol)
	sort.Float64s(allSharpe)
	
	percentiles := map[string]float64{
		"p5":   percentile(allFinalValues, 0.05),
		"p10":  percentile(allFinalValues, 0.10),
		"p25":  percentile(allFinalValues, 0.25),
		"p50":  percentile(allFinalValues, 0.50),
		"p75":  percentile(allFinalValues, 0.75),
		"p90":  percentile(allFinalValues, 0.90),
		"p95":  percentile(allFinalValues, 0.95),
	}
	
	meanFinal := 0.0
	for _, v := range allFinalValues { meanFinal += v }
	meanFinal /= float64(numPaths)
	
	// Probability of loss
	lossCount := 0
	initial := params.InitialValue
	if initial == 0 { initial = totalValue }
	for _, v := range allFinalValues {
		if v < initial { lossCount++ }
	}
	probLoss := float64(lossCount) / float64(numPaths) * 100
	
	// VaR 95
	var95 := (initial - percentile(allFinalValues, 0.05)) / initial * 100
	
	// Expected Shortfall (CVaR)
	tailSum := 0.0
	tailCount := 0
	cutoff := percentile(allFinalValues, 0.05)
	for _, v := range allFinalValues {
		if v <= cutoff {
			tailSum += v
			tailCount++
		}
	}
	expectedShortfall := 0.0
	if tailCount > 0 {
		expectedShortfall = (initial - tailSum/float64(tailCount)) / initial * 100
	}
	
	// Max drawdown distribution
	maxDDDist := map[string]float64{
		"p50":  percentile(allMaxDD, 0.50) * 100,
		"p75":  percentile(allMaxDD, 0.75) * 100,
		"p90":  percentile(allMaxDD, 0.90) * 100,
		"p95":  percentile(allMaxDD, 0.95) * 100,
		"p99":  percentile(allMaxDD, 0.99) * 100,
	}
	
	result := &MonteCarloResult{
		Percentiles:         percentiles,
		MeanFinalValue:      meanFinal,
		MedianFinalValue:    percentile(allFinalValues, 0.50),
		StdDev:              stdDev(allFinalValues),
		ProbLoss:            probLoss,
		Var95:               var95,
		ExpectedShortfall:   expectedShortfall,
		MaxDrawdownDist:     maxDDDist,
		Paths:               samplePaths,
	}
	
	// Save results
	resultJSON, _ := json.Marshal(result)
	sim.Status = "completed"
	sim.Results = string(resultJSON)
	completed := time.Now()
	sim.CompletedAt = &completed
	db.Save(&sim)
	
	// Save individual paths (sample)
	for i, p := range samplePaths {
		res := SimulationResult{
			SimulationID:    sim.ID,
			PathIndex:       i,
			FinalValue:      p.FinalValue,
			MaxDrawdown:     p.MaxDrawdown,
			Volatility:      p.Volatility,
			SharpeRatio:     p.SharpeRatio,
			Returns:         toJSON(p.Returns),
			Values:          toJSON(p.Values),
		}
		db.Create(&res)
	}
	
	return sim, result, nil
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 { return 0 }
	idx := int(float64(len(sorted)-1) * p)
	if idx >= len(sorted) { idx = len(sorted) - 1 }
	if idx < 0 { idx = 0 }
	return sorted[idx]
}

func stdDev(vals []float64) float64 {
	if len(vals) < 2 { return 0 }
	mean := 0.0
	for _, v := range vals { mean += v }
	mean /= float64(len(vals))
	sum := 0.0
	for _, v := range vals {
		d := v - mean
		sum += d * d
	}
	return math.Sqrt(sum / float64(len(vals)-1))
}

func min(a, b int) int {
	if a < b { return a }
	return b
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
