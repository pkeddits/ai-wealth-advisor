package analytics

import (
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

func (h *Handler) GetRiskMetrics(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	metrics, err := h.service.GetRiskMetrics(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get risk metrics"})
		return
	}
	
	c.JSON(http.StatusOK, metrics)
}

func (h *Handler) GetPortfolioScore(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	score, err := h.service.GetPortfolioScore(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get portfolio score"})
		return
	}
	
	c.JSON(http.StatusOK, score)
}

func (h *Handler) GetCorrelationMatrix(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	days := 252
	// parse days from query if provided
	
	matrix, err := h.service.GetCorrelationMatrix(c.Request.Context(), portfolioID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get correlation matrix"})
		return
	}
	
	c.JSON(http.StatusOK, matrix)
}

func (h *Handler) GetAssetScore(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}
	
	portfolioID, _ := uuid.Parse(c.Query("portfolio_id"))
	
	score, err := h.service.CalculateAssetScore(c.Request.Context(), portfolioID, assetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate asset score"})
		return
	}
	
	c.JSON(http.StatusOK, score)
}

func (h *Handler) GetMarketRegime(c *gin.Context) {
	regime, err := h.service.GetMarketRegime(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get market regime"})
		return
	}
	
	c.JSON(http.StatusOK, regime)
}

type SetMarketRegimeRequest struct {
	Regime      MarketRegime `json:"regime" binding:"required"`
	Confidence  float64      `json:"confidence" binding:"gte=0,lte=100"`
	Indicators  string       `json:"indicators"`
	Description string       `json:"description"`
}

func (h *Handler) SetMarketRegime(c *gin.Context) {
	var req SetMarketRegimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	regime, err := h.service.SetMarketRegime(c.Request.Context(), req.Regime, req.Confidence, req.Indicators, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set market regime"})
		return
	}
	
	c.JSON(http.StatusOK, regime)
}
