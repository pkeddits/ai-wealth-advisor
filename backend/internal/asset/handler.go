package asset

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

type AssetResponse struct {
	ID          string  `json:"id"`
	Symbol      string  `json:"symbol"`
	Name        string  `json:"name"`
	Class       string  `json:"class"`
	Sector      string  `json:"sector"`
	SubSector   string  `json:"sub_sector"`
	Country     string  `json:"country"`
	Currency    string  `json:"currency"`
	Exchange    string  `json:"exchange"`
	IsActive    bool    `json:"is_active"`
	Description string  `json:"description"`
	LogoURL     string  `json:"logo_url"`
	CurrentPrice float64 `json:"current_price,omitempty"`
	Change      float64 `json:"change,omitempty"`
	ChangePct   float64 `json:"change_pct,omitempty"`
}

func (h *Handler) List(c *gin.Context) {
	class := c.Query("class")
	country := c.Query("country")
	search := c.Query("search")
	limit := 50
	offset := 0
	
	assets, total, err := h.service.List(c.Request.Context(), class, country, search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list assets"})
		return
	}
	
	response := make([]AssetResponse, len(assets))
	for i, a := range assets {
		response[i] = AssetResponse{
			ID:          a.ID.String(),
			Symbol:      a.Symbol,
			Name:        a.Name,
			Class:       string(a.Class),
			Sector:      a.Sector,
			SubSector:   a.SubSector,
			Country:     a.Country,
			Currency:    a.Currency,
			Exchange:    a.Exchange,
			IsActive:    a.IsActive,
			Description: a.Description,
			LogoURL:     a.LogoURL,
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data":  response,
		"total": total,
		"limit": limit,
		"offset": offset,
	})
}

func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}
	
	a, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}
	
	// Get latest price
	currentPrice := 0.0
	change := 0.0
	changePct := 0.0
	if len(a.Prices) > 0 {
		currentPrice = a.Prices[0].Close
		if len(a.Prices) > 1 {
			prevClose := a.Prices[1].Close
			change = currentPrice - prevClose
			if prevClose > 0 {
				changePct = (change / prevClose) * 100
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"id":            a.ID.String(),
		"symbol":        a.Symbol,
		"name":          a.Name,
		"class":         string(a.Class),
		"sector":        a.Sector,
		"sub_sector":    a.SubSector,
		"country":       a.Country,
		"currency":      a.Currency,
		"exchange":      a.Exchange,
		"is_active":     a.IsActive,
		"description":   a.Description,
		"logo_url":      a.LogoURL,
		"current_price": currentPrice,
		"change":        change,
		"change_pct":    changePct,
		"fundamentals":  a.Fundamentals,
		"prices":        a.Prices,
	})
}

func (h *Handler) Search(c *gin.Context) {
	query := c.Query("q")
	limit := 20
	if l := c.Query("limit"); l != "" {
		// parse limit
	}
	
	assets, err := h.service.Search(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	
	response := make([]AssetResponse, len(assets))
	for i, a := range assets {
		response[i] = AssetResponse{
			ID:          a.ID.String(),
			Symbol:      a.Symbol,
			Name:        a.Name,
			Class:       string(a.Class),
			Sector:      a.Sector,
			SubSector:   a.SubSector,
			Country:     a.Country,
			Currency:    a.Currency,
			Exchange:    a.Exchange,
			IsActive:    a.IsActive,
			Description: a.Description,
			LogoURL:     a.LogoURL,
		}
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetPrice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}
	
	price, err := h.service.GetCurrentPrice(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Price not found"})
		return
	}
	
	// Get previous price for change
	prices, _ := h.service.GetPriceHistory(c.Request.Context(), id, 2)
	change := 0.0
	changePct := 0.0
	if len(prices) >= 2 {
		change = prices[0].Close - prices[1].Close
		if prices[1].Close > 0 {
			changePct = (change / prices[1].Close) * 100
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"symbol":     prices[0].Asset.Symbol,
		"price":      price,
		"change":     change,
		"change_pct": changePct,
		"timestamp":  prices[0].Date.Unix(),
	})
}

func (h *Handler) GetFundamentals(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}
	
	f, err := h.service.GetFundamentals(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get fundamentals"})
		return
	}
	
	if f == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fundamentals not found"})
		return
	}
	
	c.JSON(http.StatusOK, f)
}
