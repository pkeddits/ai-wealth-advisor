package alert

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

func (h *Handler) CreateAlert(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	
	var alert Alert
	if err := c.ShouldBindJSON(&alert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	alert.UserID = userID
	if err := h.service.CreateAlert(c.Request.Context(), &alert); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create alert"})
		return
	}
	
	c.JSON(http.StatusCreated, alert)
}

func (h *Handler) GetAlerts(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	portfolioID := c.Query("portfolio_id")
	
	var pID *uuid.UUID
	if portfolioID != "" {
		id, _ := uuid.Parse(portfolioID)
		pID = &id
	}
	
	alerts, err := h.service.GetAlerts(c.Request.Context(), userID, pID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get alerts"})
		return
	}
	
	c.JSON(http.StatusOK, alerts)
}

func (h *Handler) GetAlert(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}
	
	alert, err := h.service.GetAlert(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert not found"})
		return
	}
	
	c.JSON(http.StatusOK, alert)
}

func (h *Handler) UpdateAlert(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}
	
	var alert Alert
	if err := c.ShouldBindJSON(&alert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	alert.ID = id
	if err := h.service.UpdateAlert(c.Request.Context(), &alert); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update alert"})
		return
	}
	
	c.JSON(http.StatusOK, alert)
}

func (h *Handler) DeleteAlert(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}
	
	if err := h.service.DeleteAlert(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete alert"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Alert deleted"})
}

func (h *Handler) ToggleAlert(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}
	
	var req struct {
		Enabled bool `json:"enabled" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.service.ToggleAlert(c.Request.Context(), id, req.Enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle alert"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Alert toggled"})
}

func (h *Handler) GetTriggers(c *gin.Context) {
	alertID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}
	
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	triggers, err := h.service.GetTriggers(c.Request.Context(), alertID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get triggers"})
		return
	}
	
	c.JSON(http.StatusOK, triggers)
}

func (h *Handler) AcknowledgeTrigger(c *gin.Context) {
	triggerID, err := uuid.Parse(c.Param("triggerId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trigger ID"})
		return
	}
	
	if err := h.service.AcknowledgeTrigger(c.Request.Context(), triggerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to acknowledge"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Acknowledged"})
}

func (h *Handler) GetNotificationPreferences(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	prefs, err := h.service.GetNotificationPreferences(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get preferences"})
		return
	}
	c.JSON(http.StatusOK, prefs)
}

func (h *Handler) UpdateNotificationPreferences(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	
	var prefs NotificationPreference
	if err := c.ShouldBindJSON(&prefs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	prefs.UserID = userID
	if err := h.service.UpdateNotificationPreferences(c.Request.Context(), &prefs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}
	
	c.JSON(http.StatusOK, prefs)
}
