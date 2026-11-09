package simulation

import (
	"context"
	"encoding/json"
	"math"
	"time"

	"ai-wealth-advisor/backend/internal/portfolio"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Shock struct {
	AssetClass string  `json:"asset_class"` // acoes, fiis, etfs, renda_fixa, cripto, internacional
	Symbol     string  `json:"symbol"`      // specific symbol, empty = all in class
	Return     float64 `json:"return"`      // e.g., -0.3 for -30%
	Duration   int     `json:"duration"`    // days
}

func RunStressTest(ctx context.Context, db *gorm.DB, portfolioSvc *portfolio.Service, portfolioID uuid.UUID, scenario StressTestScenario) (*Simulation, map[string]interface{}, error) {
	sim := &Simulation{
		Name:        "Stress Test - " + scenario.Name,
		PortfolioID: portfolioID,
		Type:        "stress_test",
		Status:      "running",
	}
	paramsJSON, _ := json.Marshal(map[string]interface{}{"scenario_id": scenario.ID})
	sim.Params = string(paramsJSON)
	now := time.Now()
	sim.StartedAt = &now
	db.Create(&sim)
	
	positions, err := portfolioSvc.GetPositions(ctx, portfolioID, uuid.Nil)
	if err != nil {
		sim.Status = "failed"
		sim.ErrorMessage = err.Error()
		db.Save(sim)
		return sim, nil, err
	}
	
	// Parse shocks
	var shocks []Shock
	json.Unmarshal([]byte(scenario.Shocks), &shocks)
	
	// Calculate impact
	totalValue := 0.0
	impactByClass := make(map[string]float64)
	
	for _, pos := range positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 { value = pos.Quantity * pos.AveragePrice }
		totalValue += value
		
		// Find matching shock
		shockReturn := 0.0
		for _, s := range shocks {
			if s.Symbol != "" && s.Symbol == pos.Asset.Symbol {
				shockReturn = s.Return
				break
			}
			if s.Symbol == "" && s.AssetClass == pos.Asset.Class {
				shockReturn = s.Return
			}
		}
		
		impactByClass[pos.Asset.Class] += value * shockReturn
	}
	
	totalImpact := 0.0
	for _, v := range impactByClass { totalImpact += v }
	newValue := totalValue + totalImpact
	totalReturn := totalImpact / totalValue * 100
	
	result := map[string]interface{}{
		"initial_value":      totalValue,
		"final_value":        newValue,
		"total_return_pct":   totalReturn,
		"impact_by_class":    impactByClass,
		"scenario":           scenario.Name,
	}
	
	resultJSON, _ := json.Marshal(result)
	sim.Status = "completed"
	sim.Results = string(resultJSON)
	completed := time.Now()
	sim.CompletedAt = &completed
	db.Save(&sim)
	
	return sim, result, nil
}

// Predefined scenarios
func GetPredefinedScenarios() []StressTestScenario {
	return []StressTestScenario{
		{
			Name:        "Crise 2008",
			Description: "Simulação da crise financeira global de 2008",
			Shocks: toJSON([]Shock{
				{AssetClass: "acoes", Return: -0.45, Duration: 252},
				{AssetClass: "fiis", Return: -0.35, Duration: 252},
				{AssetClass: "etfs", Return: -0.40, Duration: 252},
				{AssetClass: "cripto", Return: -0.60, Duration: 252},
				{AssetClass: "internacional", Return: -0.50, Duration: 252},
				{AssetClass: "renda_fixa", Return: 0.05, Duration: 252},
			}),
		},
		{
			Name:        "COVID-19 (Mar 2020)",
			Description: "Choque inicial da pandemia",
			Shocks: toJSON([]Shock{
				{AssetClass: "acoes", Return: -0.35, Duration: 30},
				{AssetClass: "fiis", Return: -0.30, Duration: 30},
				{AssetClass: "cripto", Return: -0.50, Duration: 30},
				{AssetClass: "renda_fixa", Return: 0.02, Duration: 30},
			}),
		},
		{
			Name:        "Alta de Juros",
			Description: "Cenário de aumento agressivo de taxas de juros",
			Shocks: toJSON([]Shock{
				{AssetClass: "renda_fixa", Return: -0.10, Duration: 126},
				{AssetClass: "fiis", Return: -0.20, Duration: 126},
				{AssetClass: "acoes", Return: -0.15, Duration: 126},
				{AssetClass: "cripto", Return: -0.30, Duration: 126},
			}),
		},
		{
			Name:        "Crise Cambial",
			Description: "Desvalorização forte do Real",
			Shocks: toJSON([]Shock{
				{AssetClass: "acoes", Return: -0.25, Duration: 63},
				{AssetClass: "internacional", Return: 0.30, Duration: 63}, // USD assets gain in BRL
				{AssetClass: "cripto", Return: 0.20, Duration: 63},
			}),
		},
		{
			Name:        "Bear Market Crypto",
			Description: "Inverno cripto (-70% a -90%)",
			Shocks: toJSON([]Shock{
				{AssetClass: "cripto", Return: -0.80, Duration: 365},
			}),
		},
	}
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
