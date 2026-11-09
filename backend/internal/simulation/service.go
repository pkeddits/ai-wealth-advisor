package simulation

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"net/http"
	"strconv"
)

type Service struct {
	db           *gorm.DB
	portfolioSvc *portfolio.Service
	analyticsSvc *analytics.Service
}

func NewService(db *gorm.DB, portfolioSvc *portfolio.Service, analyticsSvc *analytics.Service) *Service {
	return &Service{db: db, portfolioSvc: portfolioSvc, analyticsSvc: analyticsSvc}
}

func (s *Service) CreateMonteCarlo(ctx context.Context, portfolioID uuid.UUID, params MonteCarloParams) (*Simulation, *MonteCarloResult, error) {
	return RunMonteCarlo(ctx, s.db, s.portfolioSvc, s.analyticsSvc, portfolioID, params)
}

func (s *Service) CreateStressTest(ctx context.Context, portfolioID uuid.UUID, scenarioID uuid.UUID) (*Simulation, map[string]interface{}, error) {
	var scenario StressTestScenario
	if err := s.db.First(&scenario, scenarioID).Error; err != nil {
		return nil, nil, err
	}
	return RunStressTest(ctx, s.db, s.portfolioSvc, portfolioID, scenario)
}

func (s *Service) CreateBacktest(ctx context.Context, portfolioID uuid.UUID, config StrategyConfig, startDate, endDate time.Time) (*Backtest, error) {
	return RunBacktest(ctx, s.db, s.portfolioSvc, portfolioID, config, startDate, endDate)
}

func (s *Service) GetSimulations(ctx context.Context, portfolioID uuid.UUID, limit int) ([]Simulation, error) {
	var sims []Simulation
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Order("created_at DESC").
		Limit(limit).
		Find(&sims).Error
	return sims, err
}

func (s *Service) GetSimulation(ctx context.Context, id uuid.UUID) (*Simulation, error) {
	var sim Simulation
	err := s.db.First(&sim, id).Error
	return &sim, err
}

func (s *Service) GetSimulationResults(ctx context.Context, simulationID uuid.UUID) ([]SimulationResult, error) {
	var results []SimulationResult
	err := s.db.Where("simulation_id = ?", simulationID).
		Order("path_index ASC").
		Find(&results).Error
	return results, err
}

func (s *Service) GetStressTestScenarios(ctx context.Context) ([]StressTestScenario, error) {
	var scenarios []StressTestScenario
	err := s.db.Order("created_at ASC").Find(&scenarios).Error
	if err != nil {
		return nil, err
	}
	if len(scenarios) == 0 {
		// Insert predefined
		for _, sc := range GetPredefinedScenarios() {
			s.db.Create(&sc)
			scenarios = append(scenarios, sc)
		}
	}
	return scenarios, nil
}

func (s *Service) GetBacktests(ctx context.Context, portfolioID uuid.UUID) ([]Backtest, error) {
	var backtests []Backtest
	err := s.db.Where("portfolio_id = ?", portfolioID).
		Order("created_at DESC").
		Find(&backtests).Error
	return backtests, err
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RunMonteCarlo(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	var params MonteCarloParams
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Set defaults
	if params.NumPaths == 0 { params.NumPaths = 500 }
	if params.TimeHorizon == 0 { params.TimeHorizon = 252 }
	if params.ConfidenceLevel == 0 { params.ConfidenceLevel = 0.95 }
	
	sim, result, err := h.service.CreateMonteCarlo(c.Request.Context(), portfolioID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Simulation failed", "details": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"simulation": sim, "result": result})
}

func (h *Handler) RunStressTest(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	scenarioID, err := uuid.Parse(c.Query("scenario_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scenario ID"})
		return
	}
	
	sim, result, err := h.service.CreateStressTest(c.Request.Context(), portfolioID, scenarioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Stress test failed", "details": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"simulation": sim, "result": result})
}

func (h *Handler) GetStressScenarios(c *gin.Context) {
	scenarios, err := h.service.GetStressTestScenarios(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get scenarios"})
		return
	}
	c.JSON(http.StatusOK, scenarios)
}

func (h *Handler) RunBacktest(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	var config StrategyConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	startDate, _ := time.Parse("2006-01-02", c.DefaultQuery("start_date", time.Now().AddDate(-1, 0, 0).Format("2006-01-02")))
	endDate, _ := time.Parse("2006-01-02", c.DefaultQuery("end_date", time.Now().Format("2006-01-02")))
	
	bt, err := h.service.CreateBacktest(c.Request.Context(), portfolioID, config, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Backtest failed", "details": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, bt)
}

func (h *Handler) ListSimulations(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sims, err := h.service.GetSimulations(c.Request.Context(), portfolioID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list simulations"})
		return
	}
	c.JSON(http.StatusOK, sims)
}

func (h *Handler) GetSimulation(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid simulation ID"})
		return
	}
	
	sim, err := h.service.GetSimulation(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Simulation not found"})
		return
	}
	
	results, _ := h.service.GetSimulationResults(c.Request.Context(), id)
	
	c.JSON(http.StatusOK, gin.H{"simulation": sim, "results": results})
}

func (h *Handler) ListBacktests(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	backtests, err := h.service.GetBacktests(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list backtests"})
		return
	}
	c.JSON(http.StatusOK, backtests)
}
