package ai

import (
	"context"
	
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

func (h *Handler) AnalyzePortfolio(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	// Trigger analysis (async in production)
	analysis, err := h.service.AnalyzePortfolio(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Analysis failed", "details": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, analysis)
}

func (h *Handler) GetRecommendations(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	recs, err := h.service.GetRecommendations(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recommendations"})
		return
	}
	
	c.JSON(http.StatusOK, recs)
}

func (h *Handler) GetOpportunities(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Query("portfolio_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	opps, err := h.service.GetOpportunities(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get opportunities"})
		return
	}
	
	c.JSON(http.StatusOK, opps)
}

func (h *Handler) GetAnalysis(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Param("portfolioId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	analysis, err := h.service.GetLatestAnalysis(c.Request.Context(), portfolioID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No analysis found"})
		return
	}
	
	c.JSON(http.StatusOK, analysis)
}

type OpportunityScanRequest struct {
	RiskProfile string  `json:"risk_profile" binding:"required,oneof=conservador moderado arrojado"`
	Capital     float64 `json:"capital" binding:"required,gt=0"`
}

func (h *Handler) OpportunityScan(c *gin.Context) {
	var req OpportunityScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// This would trigger a broader market scan
	// For now return empty
	c.JSON(http.StatusOK, gin.H{
		"message": "Opportunity scan initiated",
		"risk_profile": req.RiskProfile,
		"capital": req.Capital,
	})
}
