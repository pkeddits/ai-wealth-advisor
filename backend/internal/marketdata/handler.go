package marketdata

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"strconv"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetQuote(c *gin.Context) {
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Symbol required"})
		return
	}
	
	quote, err := h.service.GetQuote(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quote not found"})
		return
	}
	
	c.JSON(http.StatusOK, quote)
}

func (h *Handler) GetCandles(c *gin.Context) {
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Symbol required"})
		return
	}
	
	interval := c.DefaultQuery("interval", "1d")
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	
	candles, err := h.service.GetCandles(c.Request.Context(), symbol, interval, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get candles"})
		return
	}
	
	c.JSON(http.StatusOK, candles)
}

func (h *Handler) GetFundamentals(c *gin.Context) {
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Symbol required"})
		return
	}
	
	f, err := h.service.GetFundamentals(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fundamentals not found"})
		return
	}
	
	c.JSON(http.StatusOK, f)
}

func (h *Handler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query required"})
		return
	}
	
	results, err := h.service.Search(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	
	c.JSON(http.StatusOK, results)
}

type RefreshRequest struct {
	Symbols []string `json:"symbols"`
}

func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// If symbols provided, refresh those; otherwise refresh all
	if len(req.Symbols) > 0 {
		// Convert symbols to asset IDs
		// For now just return success
		c.JSON(http.StatusOK, gin.H{"message": "Refresh initiated", "symbols": req.Symbols})
	} else {
		// Refresh all - would be a background job
		c.JSON(http.StatusOK, gin.H{"message": "Full refresh initiated"})
	}
}
