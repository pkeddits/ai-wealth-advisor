package transaction

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"time"
	"strconv"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type CreateTransactionRequest struct {
	PortfolioID string          `json:"portfolio_id" binding:"required,uuid"`
	AssetID     string          `json:"asset_id" binding:"required,uuid"`
	Type        TransactionType `json:"type" binding:"required,oneof=buy sell dividend interest split merge bonus subscription"`
	Date        string          `json:"date" binding:"required"` // YYYY-MM-DD
	Quantity    float64         `json:"quantity" binding:"required,gt=0"`
	Price       float64         `json:"price" binding:"required,gte=0"`
	Fees        float64         `json:"fees" binding:"omitempty,gte=0"`
	Taxes       float64         `json:"taxes" binding:"omitempty,gte=0"`
	Notes       string          `json:"notes"`
}

type UpdateTransactionRequest struct {
	Date     string  `json:"date" binding:"omitempty"`
	Quantity float64 `json:"quantity" binding:"omitempty,gt=0"`
	Price    float64 `json:"price" binding:"omitempty,gte=0"`
	Fees     float64 `json:"fees" binding:"omitempty,gte=0"`
	Taxes    float64 `json:"taxes" binding:"omitempty,gte=0"`
	Notes    string  `json:"notes"`
}

type TransactionResponse struct {
	ID          string  `json:"id"`
	PortfolioID string  `json:"portfolio_id"`
	AssetID     string  `json:"asset_id"`
	AssetSymbol string  `json:"asset_symbol"`
	AssetName   string  `json:"asset_name"`
	Type        string  `json:"type"`
	Date        string  `json:"date"`
	Quantity    float64 `json:"quantity"`
	Price       float64 `json:"price"`
	Fees        float64 `json:"fees"`
	Taxes       float64 `json:"taxes"`
	TotalValue  float64 `json:"total_value"`
	Notes       string  `json:"notes"`
	CreatedAt   string  `json:"created_at"`
}

func (h *Handler) List(c *gin.Context) {
	portfolioID, err := uuid.Parse(c.Query("portfolio_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid portfolio ID"})
		return
	}
	
	var assetID *uuid.UUID
	if a := c.Query("asset_id"); a != "" {
		id, _ := uuid.Parse(a)
		assetID = &id
	}
	
	var txnType *TransactionType
	if t := c.Query("type"); t != "" {
		tt := TransactionType(t)
		txnType = &tt
	}
	
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	
	txns, total, err := h.service.List(c.Request.Context(), portfolioID, assetID, txnType, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list transactions"})
		return
	}
	
	response := make([]TransactionResponse, len(txns))
	for i, t := range txns {
		response[i] = TransactionResponse{
			ID:          t.ID.String(),
			PortfolioID: t.PortfolioID.String(),
			AssetID:     t.AssetID.String(),
			AssetSymbol: t.Asset.Symbol,
			AssetName:   t.Asset.Name,
			Type:        string(t.Type),
			Date:        t.Date.Format("2006-01-02"),
			Quantity:    t.Quantity,
			Price:       t.Price,
			Fees:        t.Fees,
			Taxes:       t.Taxes,
			TotalValue:  t.TotalValue,
			Notes:       t.Notes,
			CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z"),
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}
	
	t, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}
	
	c.JSON(http.StatusOK, TransactionResponse{
		ID:          t.ID.String(),
		PortfolioID: t.PortfolioID.String(),
		AssetID:     t.AssetID.String(),
		AssetSymbol: t.Asset.Symbol,
		AssetName:   t.Asset.Name,
		Type:        string(t.Type),
		Date:        t.Date.Format("2006-01-02"),
		Quantity:    t.Quantity,
		Price:       t.Price,
		Fees:        t.Fees,
		Taxes:       t.Taxes,
		TotalValue:  t.TotalValue,
		Notes:       t.Notes,
		CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	portfolioID, _ := uuid.Parse(req.PortfolioID)
	assetID, _ := uuid.Parse(req.AssetID)
	date, _ := time.Parse("2006-01-02", req.Date)
	
	t := &Transaction{
		PortfolioID: portfolioID,
		AssetID:     assetID,
		Type:        req.Type,
		Date:        date,
		Quantity:    req.Quantity,
		Price:       req.Price,
		Fees:        req.Fees,
		Taxes:       req.Taxes,
		Notes:       req.Notes,
	}
	
	if err := h.service.Create(c.Request.Context(), t); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}
	
	c.JSON(http.StatusCreated, TransactionResponse{
		ID:          t.ID.String(),
		PortfolioID: t.PortfolioID.String(),
		AssetID:     t.AssetID.String(),
		Type:        string(t.Type),
		Date:        t.Date.Format("2006-01-02"),
		Quantity:    t.Quantity,
		Price:       t.Price,
		Fees:        t.Fees,
		Taxes:       t.Taxes,
		TotalValue:  t.TotalValue,
		Notes:       t.Notes,
		CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}
	
	var req UpdateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	updates := make(map[string]interface{})
	if req.Date != "" {
		if d, err := time.Parse("2006-01-02", req.Date); err == nil {
			updates["date"] = d
		}
	}
	if req.Quantity > 0 {
		updates["quantity"] = req.Quantity
	}
	if req.Price >= 0 {
		updates["price"] = req.Price
	}
	if req.Fees >= 0 {
		updates["fees"] = req.Fees
	}
	if req.Taxes >= 0 {
		updates["taxes"] = req.Taxes
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}
	
	t, err := h.service.Update(c.Request.Context(), id, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
		return
	}
	
	c.JSON(http.StatusOK, TransactionResponse{
		ID:          t.ID.String(),
		PortfolioID: t.PortfolioID.String(),
		AssetID:     t.AssetID.String(),
		Type:        string(t.Type),
		Date:        t.Date.Format("2006-01-02"),
		Quantity:    t.Quantity,
		Price:       t.Price,
		Fees:        t.Fees,
		Taxes:       t.Taxes,
		TotalValue:  t.TotalValue,
		Notes:       t.Notes,
		CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction ID"})
		return
	}
	
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete transaction"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Transaction deleted"})
}
