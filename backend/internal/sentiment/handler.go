package sentiment

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

func (h *Handler) GetMarketSentiment(c *gin.Context) {
	sentiment, err := h.service.GetMarketSentiment(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get sentiment"})
		return
	}
	c.JSON(http.StatusOK, sentiment)
}

func (h *Handler) GetMarketSentimentHistory(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	history, err := h.service.GetMarketSentimentHistory(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get history"})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (h *Handler) GetAssetSentiment(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("assetId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}
	
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	history, err := h.service.GetAssetSentimentHistory(c.Request.Context(), assetID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get asset sentiment"})
		return
	}
	c.JSON(http.StatusOK, history)
}

func (h *Handler) GetRecentNews(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	news, err := h.service.GetRecentNews(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get news"})
		return
	}
	c.JSON(http.StatusOK, news)
}

func (h *Handler) GetNewsBySymbol(c *gin.Context) {
	symbol := c.Param("symbol")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	news, err := h.service.GetNewsBySymbol(c.Request.Context(), symbol, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get news"})
		return
	}
	c.JSON(http.StatusOK, news)
}

type FetchNewsRequest struct {
	Symbols []string `json:"symbols"`
	Limit   int      `json:"limit"`
}

func (h *Handler) FetchNews(c *gin.Context) {
	var req FetchNewsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if req.Limit == 0 {
		req.Limit = 50
	}
	
	news, err := h.service.FetchAndAnalyze(c.Request.Context(), req.Symbols, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch news", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"fetched": len(news), "news": news})
}

func (h *Handler) GetSentimentStats(c *gin.Context) {
	stats, err := h.service.GetSentimentStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}
