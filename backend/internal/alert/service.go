package alert

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/marketdata"
	"ai-wealth-advisor/backend/internal/portfolio"
	"ai-wealth-advisor/backend/internal/sentiment"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	db            *gorm.DB
	assetSvc      *asset.Service
	portfolioSvc  *portfolio.Service
	marketSvc     *marketdata.Service
	sentimentSvc  *sentiment.Service
	emailSvc      EmailService
	webhookSvc    WebhookService
}

type EmailService interface {
	Send(to, subject, body string) error
}

type WebhookService interface {
	Post(url string, payload map[string]interface{}) error
}

func NewService(db *gorm.DB, assetSvc *asset.Service, portfolioSvc *portfolio.Service, marketSvc *marketdata.Service, sentimentSvc *sentiment.Service, emailSvc EmailService, webhookSvc WebhookService) *Service {
	return &Service{
		db:            db,
		assetSvc:      assetSvc,
		portfolioSvc:  portfolioSvc,
		marketSvc:     marketSvc,
		sentimentSvc:  sentimentSvc,
		emailSvc:      emailSvc,
		webhookSvc:    webhookSvc,
	}
}

func (s *Service) CreateAlert(ctx context.Context, alert *Alert) error {
	alert.ID = uuid.New()
	alert.CreatedAt = time.Now()
	alert.UpdatedAt = time.Now()
	return s.db.Create(alert).Error
}

func (s *Service) GetAlert(ctx context.Context, id uuid.UUID) (*Alert, error) {
	var alert Alert
	err := s.db.First(&alert, id).Error
	return &alert, err
}

func (s *Service) GetAlerts(ctx context.Context, userID uuid.UUID, portfolioID *uuid.UUID) ([]Alert, error) {
	var alerts []Alert
	query := s.db.Where("user_id = ?", userID)
	if portfolioID != nil {
		query = query.Where("portfolio_id = ?", *portfolioID)
	}
	err := query.Order("created_at DESC").Find(&alerts).Error
	return alerts, err
}

func (s *Service) UpdateAlert(ctx context.Context, alert *Alert) error {
	alert.UpdatedAt = time.Now()
	return s.db.Save(alert).Error
}

func (s *Service) DeleteAlert(ctx context.Context, id uuid.UUID) error {
	return s.db.Delete(&Alert{}, id).Error
}

func (s *Service) ToggleAlert(ctx context.Context, id uuid.UUID, enabled bool) error {
	return s.db.Model(&Alert{}).Where("id = ?", id).Update("enabled", enabled).Error
}

func (s *Service) CheckAlerts(ctx context.Context) error {
	var alerts []Alert
	err := s.db.Where("enabled = ?", true).Find(&alerts).Error
	if err != nil {
		return err
	}
	
	for _, alert := range alerts {
		if s.shouldCheck(alert) {
			s.checkAlert(ctx, alert)
		}
	}
	
	return nil
}

func (s *Service) shouldCheck(alert Alert) bool {
	if alert.LastTriggered == nil {
		return true
	}
	elapsed := time.Since(*alert.LastTriggered).Minutes()
	return elapsed >= float64(alert.Cooldown)
}

func (s *Service) checkAlert(ctx context.Context, alert Alert) {
	triggered := false
	var value float64
	var message string
	var data map[string]interface{}
	
	switch alert.Type {
	case "price":
		triggered, value, message, data = s.checkPriceAlert(ctx, alert)
	case "percent_change":
		triggered, value, message, data = s.checkPercentChangeAlert(ctx, alert)
	case "portfolio_value":
		triggered, value, message, data = s.checkPortfolioValueAlert(ctx, alert)
	case "drawdown":
		triggered, value, message, data = s.checkDrawdownAlert(ctx, alert)
	case "concentration":
		triggered, value, message, data = s.checkConcentrationAlert(ctx, alert)
	case "news_sentiment":
		triggered, value, message, data = s.checkNewsSentimentAlert(ctx, alert)
	case "volume":
		triggered, value, message, data = s.checkVolumeAlert(ctx, alert)
	}
	
	if triggered {
		s.triggerAlert(ctx, alert, value, message, data)
	}
}

func (s *Service) checkPriceAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	if alert.AssetID == nil {
		return false, 0, "", nil
	}
	
	quote, err := s.marketSvc.GetQuote(ctx, "")
	if err != nil {
		// Get asset symbol
		asset, err := s.assetSvc.Get(ctx, *alert.AssetID)
		if err != nil {
			return false, 0, "", nil
		}
		quote, err = s.marketSvc.GetQuote(ctx, asset.Symbol)
		if err != nil {
			return false, 0, "", nil
		}
	}
	
	triggered := false
	switch alert.Condition {
	case "above":
		triggered = quote.Price >= alert.Threshold
	case "below":
		triggered = quote.Price <= alert.Threshold
	}
	
	msg := fmt.Sprintf("Preço de %s: R$ %.2f", quote.Symbol, quote.Price)
	data := map[string]interface{}{
		"symbol": quote.Symbol,
		"price":  quote.Price,
		"change_pct": quote.ChangePercent,
	}
	
	return triggered, quote.Price, msg, data
}

func (s *Service) checkPercentChangeAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	if alert.AssetID == nil {
		return false, 0, "", nil
	}
	
	asset, err := s.assetSvc.Get(ctx, *alert.AssetID)
	if err != nil {
		return false, 0, "", nil
	}
	
	quote, err := s.marketSvc.GetQuote(ctx, asset.Symbol)
	if err != nil {
		return false, 0, "", nil
	}
	
	triggered := false
	switch alert.Condition {
	case "increase_by":
		triggered = quote.ChangePercent >= alert.Threshold
	case "decrease_by":
		triggered = quote.ChangePercent <= -alert.Threshold
	case "above":
		triggered = quote.ChangePercent >= alert.Threshold
	case "below":
		triggered = quote.ChangePercent <= alert.Threshold
	}
	
	msg := fmt.Sprintf("%s variou %.2f%%", asset.Symbol, quote.ChangePercent)
	data := map[string]interface{}{
		"symbol": asset.Symbol,
		"price": quote.Price,
		"change_pct": quote.ChangePercent,
	}
	
	return triggered, quote.ChangePercent, msg, data
}

func (s *Service) checkPortfolioValueAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	p, err := s.portfolioSvc.Get(ctx, alert.PortfolioID, alert.UserID)
	if err != nil {
		return false, 0, "", nil
	}
	
	positions, err := s.portfolioSvc.GetPositions(ctx, alert.PortfolioID, alert.UserID)
	if err != nil {
		return false, 0, "", nil
	}
	
	totalValue := 0.0
	for _, pos := range positions {
		v := pos.Quantity * pos.CurrentPrice
		if v <= 0 { v = pos.Quantity * pos.AveragePrice }
		totalValue += v
	}
	
	triggered := false
	switch alert.Condition {
	case "above":
		triggered = totalValue >= alert.Threshold
	case "below":
		triggered = totalValue <= alert.Threshold
	case "increase_by":
		// Compare with previous close (simplified)
		triggered = false
	case "decrease_by":
		triggered = false
	}
	
	msg := fmt.Sprintf("Valor da carteira %s: R$ %.2f", p.Name, totalValue)
	data := map[string]interface{}{
		"portfolio": p.Name,
		"value": totalValue,
	}
	
	return triggered, totalValue, msg, data
}

func (s *Service) checkDrawdownAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	// Would need portfolio snapshots - simplified
	return false, 0, "", nil
}

func (s *Service) checkConcentrationAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	positions, err := s.portfolioSvc.GetPositions(ctx, alert.PortfolioID, alert.UserID)
	if err != nil || len(positions) == 0 {
		return false, 0, "", nil
	}
	
	totalValue := 0.0
	for _, pos := range positions {
		v := pos.Quantity * pos.CurrentPrice
		if v <= 0 { v = pos.Quantity * pos.AveragePrice }
		totalValue += v
	}
	
	maxConcentration := 0.0
	maxAsset := ""
	for _, pos := range positions {
		v := pos.Quantity * pos.CurrentPrice
		if v <= 0 { v = pos.Quantity * pos.AveragePrice }
		pct := 0.0
		if totalValue > 0 {
			pct = v / totalValue * 100
		}
		if pct > maxConcentration {
			maxConcentration = pct
			maxAsset = pos.Asset.Symbol
		}
	}
	
	triggered := maxConcentration >= alert.Threshold
	msg := fmt.Sprintf("Concentração máxima: %s com %.1f%%", maxAsset, maxConcentration)
	data := map[string]interface{}{
		"max_concentration": maxConcentration,
		"asset": maxAsset,
	}
	
	return triggered, maxConcentration, msg, data
}

func (s *Service) checkNewsSentimentAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	sent, err := s.sentimentSvc.GetMarketSentiment(ctx)
	if err != nil {
		return false, 0, "", nil
	}
	
	triggered := false
	switch alert.Condition {
	case "below":
		triggered = sent.FearGreedIndex <= int(alert.Threshold)
	case "above":
		triggered = sent.FearGreedIndex >= int(alert.Threshold)
	}
	
	msg := fmt.Sprintf("Fear & Greed Index: %d", sent.FearGreedIndex)
	data := map[string]interface{}{
		"fear_greed": sent.FearGreedIndex,
		"sentiment_score": sent.OverallScore,
	}
	
	return triggered, float64(sent.FearGreedIndex), msg, data
}

func (s *Service) checkVolumeAlert(ctx context.Context, alert Alert) (bool, float64, string, map[string]interface{}) {
	if alert.AssetID == nil {
		return false, 0, "", nil
	}
	
	asset, err := s.assetSvc.Get(ctx, *alert.AssetID)
	if err != nil {
		return false, 0, "", nil
	}
	
	quote, err := s.marketSvc.GetQuote(ctx, asset.Symbol)
	if err != nil {
		return false, 0, "", nil
	}
	
	triggered := false
	switch alert.Condition {
	case "above":
		triggered = quote.Volume >= alert.Threshold
	case "below":
		triggered = quote.Volume <= alert.Threshold
	}
	
	msg := fmt.Sprintf("Volume de %s: %.0f", asset.Symbol, quote.Volume)
	data := map[string]interface{}{
		"symbol": asset.Symbol,
		"volume": quote.Volume,
	}
	
	return triggered, quote.Volume, msg, data
}

func (s *Service) triggerAlert(ctx context.Context, alert Alert, value float64, message string, data map[string]interface{}) {
	// Create trigger record
	trigger := AlertTrigger{
		AlertID:  alert.ID,
		Value:    value,
		Message:  message,
		Data:     toJSON(data),
	}
	s.db.Create(&trigger)
	
	// Update alert
	now := time.Now()
	alert.LastTriggered = &now
	alert.TriggerCount++
	s.db.Save(&alert)
	
	// Send notifications
	s.sendNotifications(ctx, alert, message, data)
}

func (s *Service) sendNotifications(ctx context.Context, alert Alert, message string, data map[string]interface{}) {
	// Get user preferences
	var prefs NotificationPreference
	err := s.db.Where("user_id = ?", alert.UserID).First(&prefs).Error
	if err != nil {
		// Default preferences
		prefs.EmailEnabled = true
		prefs.EmailAlerts = true
	}
	
	if prefs.EmailEnabled && prefs.EmailAlerts && s.emailSvc != nil {
		subject := fmt.Sprintf("🔔 Alerta: %s", alert.Name)
		body := fmt.Sprintf("%s

Valor: %.2f

%s", message, value, formatData(data))
		go s.emailSvc.Send("", subject, body) // User email would be fetched
	}
	
	if prefs.WebhookURL != "" && s.webhookSvc != nil {
		payload := map[string]interface{}{
			"alert_id": alert.ID,
			"alert_name": alert.Name,
			"message": message,
			"value": value,
			"data": data,
			"timestamp": time.Now(),
		}
		go s.webhookSvc.Post(prefs.WebhookURL, payload)
	}
}

func (s *Service) GetTriggers(ctx context.Context, alertID uuid.UUID, limit int) ([]AlertTrigger, error) {
	var triggers []AlertTrigger
	err := s.db.Where("alert_id = ?", alertID).
		Order("created_at DESC").
		Limit(limit).
		Find(&triggers).Error
	return triggers, err
}

func (s *Service) AcknowledgeTrigger(ctx context.Context, triggerID uuid.UUID) error {
	now := time.Now()
	return s.db.Model(&AlertTrigger{}).Where("id = ?", triggerID).
		Updates(map[string]interface{}{
			"acknowledged": true,
			"acknowledged_at": &now,
		}).Error
}

func (s *Service) GetNotificationPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error) {
	var prefs NotificationPreference
	err := s.db.Where("user_id = ?", userID).First(&prefs).Error
	if err == gorm.ErrRecordNotFound {
		prefs = NotificationPreference{UserID: userID, EmailEnabled: true, EmailAlerts: true, EmailWeekly: true}
		s.db.Create(&prefs)
		return &prefs, nil
	}
	return &prefs, err
}

func (s *Service) UpdateNotificationPreferences(ctx context.Context, prefs *NotificationPreference) error {
	prefs.UpdatedAt = time.Now()
	return s.db.Save(prefs).Error
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func formatData(data map[string]interface{}) string {
	b, _ := json.MarshalIndent(data, "", "  ")
	return string(b)
}
