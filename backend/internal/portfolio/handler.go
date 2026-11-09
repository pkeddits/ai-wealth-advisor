package portfolio

import (
	"ai-wealth-advisor/backend/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type CreatePortfolioRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Description string `json:"description"`
	Currency    string `json:"currency" binding:"omitempty,len=3"`
}

type UpdatePortfolioRequest struct {
	Name        string `json:"name" binding:"omitempty,min=1,max=100"`
	Description string `json:"description"`
	IsArchived  *bool  `json:"is_archived"`
}

type PortfolioResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Currency    string `json:"currency"`
	IsArchived  bool   `json:"is_archived"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	PositionsCount int `json:"positions_count,omitempty"`
	TotalValue  float64 `json:"total_value,omitempty"`
}

func (h *Handler) List(c *gin.Context) {
	userID, _ := c.Get("user_id")
	includeArchived := c.Query("include_archived") == "true"
	
	portfolios, err := h.service.List(c.Request.Context(), userID.(uuid.UUID), includeArchived)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list portfolios"})
		return
	}
	
	response := make([]PortfolioResponse, len(portfolios))
	for i, p := range portfolios {
		response[i] = PortfolioResponse{
			ID:          p.ID.String(),
			Name:        p.Name,
			Description: p.Description,
			Currency:    p.Currency,
			IsArchived:  p.IsArchived,
			CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *Handler) Create(c *gin.Context) {
	userID, _ := c.Get("user_id")
	
	var req CreatePortfolioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	p, err := h.service.Create(c.Request.Context(), userID.(uuid.UUID), req.Name, req.Description, req.Currency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create portfolio"})
		return
	}
	
	c.JSON(http.StatusCreated, PortfolioResponse{
		ID:          p.ID.String(),
		Name:        p.Name,
		Description: p.Description,
		Currency:    p.Currency,
		IsArchived:  p.IsArchived,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

func (h *Handler) Get(c *gin.Context) {
	userID, _ := c.Get("user_id")
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	p, err := h.service.Get(c.Request.Context(), portfolioID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Portfolio not found"})
		return
	}
	
	// Calculate total value
	totalValue := 0.0
	for _, pos := range p.Positions {
		value := pos.Quantity * pos.CurrentPrice
		if value <= 0 {
			value = pos.Quantity * pos.AveragePrice
		}
		totalValue += value
	}
	
	c.JSON(http.StatusOK, gin.H{
		"id":           p.ID.String(),
		"name":         p.Name,
		"description":  p.Description,
		"currency":     p.Currency,
		"is_archived":  p.IsArchived,
		"created_at":   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		"updated_at":   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		"positions":    p.Positions,
		"total_value":  totalValue,
	})
}

func (h *Handler) Update(c *gin.Context) {
	userID, _ := c.Get("user_id")
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	var req UpdatePortfolioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	p, err := h.service.Update(c.Request.Context(), portfolioID, userID.(uuid.UUID), req.Name, req.Description, req.IsArchived)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Portfolio not found"})
		return
	}
	
	c.JSON(http.StatusOK, PortfolioResponse{
		ID:          p.ID.String(),
		Name:        p.Name,
		Description: p.Description,
		Currency:    p.Currency,
		IsArchived:  p.IsArchived,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

func (h *Handler) Delete(c *gin.Context) {
	userID, _ := c.Get("user_id")
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	if err := h.service.Delete(c.Request.Context(), portfolioID, userID.(uuid.UUID)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Portfolio not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Portfolio deleted"})
}

func (h *Handler) GetPositions(c *gin.Context) {
	userID, _ := c.Get("user_id")
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	positions, err := h.service.GetPositions(c.Request.Context(), portfolioID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get positions"})
		return
	}
	
	type PositionResponse struct {
		ID            string  `json:"id"`
		AssetID       string  `json:"asset_id"`
		AssetSymbol   string  `json:"asset_symbol"`
		AssetName     string  `json:"asset_name"`
		AssetClass    string  `json:"asset_class"`
		Quantity      float64 `json:"quantity"`
		AveragePrice  float64 `json:"average_price"`
		CurrentPrice  float64 `json:"current_price"`
		CurrentValue  float64 `json:"current_value"`
		InvestedValue float64 `json:"invested_value"`
		PnL           float64 `json:"pnl"`
		PnLPct        float64 `json:"pnl_pct"`
		LastUpdated   string  `json:"last_updated"`
	}
	
	response := make([]PositionResponse, len(positions))
	for i, pos := range positions {
		currentValue := pos.Quantity * pos.CurrentPrice
		if currentValue <= 0 {
			currentValue = pos.Quantity * pos.AveragePrice
		}
		investedValue := pos.Quantity * pos.AveragePrice
		pnl := currentValue - investedValue
		pnlPct := 0.0
		if investedValue > 0 {
			pnlPct = (pnl / investedValue) * 100
		}
		
		response[i] = PositionResponse{
			ID:            pos.ID.String(),
			AssetID:       pos.AssetID.String(),
			AssetSymbol:   pos.Asset.Symbol,
			AssetName:     pos.Asset.Name,
			AssetClass:    string(pos.Asset.Class),
			Quantity:      pos.Quantity,
			AveragePrice:  pos.AveragePrice,
			CurrentPrice:  pos.CurrentPrice,
			CurrentValue:  currentValue,
			InvestedValue: investedValue,
			PnL:           pnl,
			PnLPct:        pnlPct,
			LastUpdated:   pos.LastUpdated.Format("2006-01-02T15:04:05Z"),
		}
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetPerformance(c *gin.Context) {
	userID, _ := c.Get("user_id")
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	days := 365
	if d := c.Query("days"); d != "" {
		// parse days
	}
	
	snapshots, err := h.service.GetPerformance(c.Request.Context(), portfolioID, userID.(uuid.UUID), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get performance"})
		return
	}
	
	type SnapshotResponse struct {
		Date        string  `json:"date"`
		TotalValue  float64 `json:"total_value"`
		DailyReturn float64 `json:"daily_return"`
	}
	
	response := make([]SnapshotResponse, len(snapshots))
	for i, s := range snapshots {
		response[i] = SnapshotResponse{
			Date:        s.Date.Format("2006-01-02"),
			TotalValue:  s.TotalValue,
			DailyReturn: s.DailyReturn,
		}
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetAllocation(c *gin.Context) {
	userID, _ := c.Get("user_id")
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	allocation, err := h.service.GetAllocation(c.Request.Context(), portfolioID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get allocation"})
		return
	}
	
	type AllocationItem struct {
		Class       string  `json:"class"`
		Percentage  float64 `json:"percentage"`
	}
	
	response := make([]AllocationItem, 0, len(allocation))
	for class, pct := range allocation {
		response = append(response, AllocationItem{Class: class, Percentage: pct})
	}
	
	c.JSON(http.StatusOK, response)
}
