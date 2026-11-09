package sentiment

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NewsProvider interface {
	FetchNews(ctx context.Context, query string, limit int) ([]RawNews, error)
	Name() string
}

type RawNews struct {
	Title       string
	Summary     string
	URL         string
	Source      string
	PublishedAt time.Time
	Symbols     []string
}

type Service struct {
	db         *gorm.DB
	providers  []NewsProvider
	httpClient *http.Client
}

func NewService(db *gorm.DB) *Service {
	return &Service{
		db:         db,
		providers:  []NewsProvider{NewGNewsProvider(), NewNewsAPIProvider()},
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *Service) FetchAndAnalyze(ctx context.Context, symbols []string, limit int) ([]NewsSentiment, error) {
	allNews := make([]RawNews, 0)
	
	for _, provider := range s.providers {
		query := ""
		if len(symbols) > 0 {
			query = strings.Join(symbols, " OR ")
		} else {
			query = "stocks OR investing OR market"
		}
		
		news, err := provider.FetchNews(ctx, query, limit)
		if err != nil {
			continue // Continue with other providers
		}
		allNews = append(allNews, news...)
	}
	
	// Deduplicate by URL
	seen := make(map[string]bool)
	uniqueNews := make([]RawNews, 0)
	for _, n := range allNews {
		if !seen[n.URL] {
			seen[n.URL] = true
			uniqueNews = append(uniqueNews, n)
		}
	}
	
	// Analyze sentiment for each
	results := make([]NewsSentiment, 0, len(uniqueNews))
	for _, n := range uniqueNews {
		sentiment, score := s.analyzeText(n.Title + " " + n.Summary)
		
		symbolsJSON, _ := json.Marshal(n.Symbols)
		
		result := NewsSentiment{
			Title:       n.Title,
			Summary:     n.Summary,
			URL:         n.URL,
			Source:      n.Source,
			PublishedAt: n.PublishedAt,
			Sentiment:   sentiment,
			Score:       score,
			Impact:      s.calculateImpact(n.Source, score),
			Symbols:     string(symbolsJSON),
			Language:    "pt",
		}
		results = append(results, result)
		
		// Save to DB (upsert by URL)
		var existing NewsSentiment
		err := s.db.Where("url = ?", n.URL).First(&existing).Error
		if err == nil {
			result.ID = existing.ID
			result.CreatedAt = existing.CreatedAt
			s.db.Save(&result)
		} else {
			s.db.Create(&result)
		}
	}
	
	// Update market sentiment aggregate
	s.updateMarketSentiment(ctx)
	
	// Update asset sentiments
	s.updateAssetSentiments(ctx, results)
	
	return results, nil
}

func (s *Service) analyzeText(text string) (string, float64) {
	// Simple rule-based sentiment (in production, use ML model or API)
	positiveWords := []string{
		"alta", "subiu", "ganho", "lucro", "crescimento", "positivo", "otimista",
		"compra", "recomenda", "forte", "recorde", "superou", "expectativa",
		"dividendo", "buyback", "expansão", "investimento", "aprovação",
		"high", "gain", "profit", "growth", "positive", "bullish", "buy",
		"strong", "record", "beat", "exceed", "dividend", "expansion",
	}
	negativeWords := []string{
		"queda", "caiu", "prejuízo", "perda", "negativo", "pessimista",
		"venda", "fraco", "abaixo", "decepcionou", "alerta", "risco",
		"crise", "recessão", "inflação", "juros", "calote", "default",
		"low", "loss", "negative", "bearish", "sell", "weak", "miss",
		"disappoint", "warning", "risk", "crisis", "recession", "default",
	}
	
	textLower := strings.ToLower(text)
	posCount := 0
	negCount := 0
	
	for _, w := range positiveWords {
		if strings.Contains(textLower, w) {
			posCount++
		}
	}
	for _, w := range negativeWords {
		if strings.Contains(textLower, w) {
			negCount++
		}
	}
	
	score := 0.0
	if posCount+negCount > 0 {
		score = float64(posCount-negCount) / float64(posCount+negCount)
	}
	
	sentiment := "neutral"
	if score > 0.1 {
		sentiment = "positive"
	} else if score < -0.1 {
		sentiment = "negative"
	}
	
	return sentiment, score
}

func (s *Service) calculateImpact(source string, score float64) float64 {
	// Source credibility weights
	weights := map[string]float64{
		"reuters":      1.0,
		"bloomberg":    1.0,
		"valor":        0.9,
		"infomoney":    0.8,
		"exame":        0.8,
		"estadao":      0.8,
		"folha":        0.7,
		"g1":           0.7,
		"cnbc":         0.9,
		"marketwatch":  0.8,
		"seekingalpha": 0.6,
		"yahoo":        0.6,
	}
	
	weight := weights[strings.ToLower(source)]
	if weight == 0 {
		weight = 0.5
	}
	
	// Impact = abs(score) * weight * 100
	impact := abs(score) * weight * 100
	if impact > 100 {
		impact = 100
	}
	return impact
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

func (s *Service) updateMarketSentiment(ctx context.Context) {
	var news []NewsSentiment
	s.db.Where("published_at >= ?", time.Now().AddDate(0, 0, -1)).
		Order("published_at DESC").
		Limit(100).
		Find(&news)
	
	if len(news) == 0 {
		return
	}
	
	var pos, neg, neu int
	totalScore := 0.0
	totalImpact := 0.0
	
	for _, n := range news {
		totalScore += n.Score * n.Impact
		totalImpact += n.Impact
		switch n.Sentiment {
		case "positive":
			pos++
		case "negative":
			neg++
		default:
			neu++
		}
	}
	
	overallScore := 0.0
	if totalImpact > 0 {
		overallScore = (totalScore / totalImpact) * 100
	}
	
	total := pos + neg + neu
	bullishPct := 0.0
	bearishPct := 0.0
	neutralPct := 0.0
	if total > 0 {
		bullishPct = float64(pos) / float64(total) * 100
		bearishPct = float64(neg) / float64(total) * 100
		neutralPct = float64(neu) / float64(total) * 100
	}
	
	// Fear & Greed approximation
	fearGreed := 50 + int(overallScore/2)
	if fearGreed > 100 {
		fearGreed = 100
	}
	if fearGreed < 0 {
		fearGreed = 0
	}
	
	sentiment := MarketSentiment{
		OverallScore:   overallScore,
		FearGreedIndex: fearGreed,
		BullishPct:     bullishPct,
		BearishPct:     bearishPct,
		NeutralPct:     neutralPct,
		NewsCount:      len(news),
		Date:           time.Now().Truncate(24 * time.Hour),
	}
	
	// Upsert
	var existing MarketSentiment
	err := s.db.Where("date = ?", sentiment.Date).First(&existing).Error
	if err == nil {
		sentiment.ID = existing.ID
		sentiment.CreatedAt = existing.CreatedAt
		s.db.Save(&sentiment)
	} else {
		s.db.Create(&sentiment)
	}
}

func (s *Service) updateAssetSentiments(ctx context.Context, news []NewsSentiment) {
	assetScores := make(map[uuid.UUID][]NewsSentiment)
	
	for _, n := range news {
		var symbols []string
		json.Unmarshal([]byte(n.Symbols), &symbols)
		for _, sym := range symbols {
			var asset Asset
			if err := s.db.Where("symbol = ?", sym).First(&asset).Error; err == nil {
				assetScores[asset.ID] = append(assetScores[asset.ID], n)
			}
		}
	}
	
	for assetID, nList := range assetScores {
		var pos, neg, neu int
		newsScore := 0.0
		socialScore := 0.0
		newsCount := 0
		socialCount := 0
		
		for _, n := range nList {
			newsScore += n.Score
			newsCount++
			switch n.Sentiment {
			case "positive":
				pos++
			case "negative":
				neg++
			default:
				neu++
			}
		}
		
		overall := 0.0
		if newsCount > 0 {
			overall = newsScore / float64(newsCount) * 100
		}
		
		bullish := 0.0
		bearish := 0.0
		if pos+neg+neu > 0 {
			bullish = float64(pos) / float64(pos+neg+neu) * 100
			bearish = float64(neg) / float64(pos+neg+neu) * 100
		}
		
		as := AssetSentiment{
			AssetID:      assetID,
			OverallScore: overall,
			NewsScore:    newsScore,
			SocialScore:  socialScore,
			NewsCount:    newsCount,
			SocialCount:  socialCount,
			BullishPct:   bullish,
			BearishPct:   bearish,
			Date:         time.Now().Truncate(24 * time.Hour),
		}
		
		var existing AssetSentiment
		err := s.db.Where("asset_id = ? AND date = ?", assetID, as.Date).First(&existing).Error
		if err == nil {
			as.ID = existing.ID
			as.CreatedAt = existing.CreatedAt
			s.db.Save(&as)
		} else {
			s.db.Create(&as)
		}
	}
}

func (s *Service) GetMarketSentiment(ctx context.Context) (*MarketSentiment, error) {
	var sentiment MarketSentiment
	err := s.db.Order("date DESC").First(&sentiment).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return &MarketSentiment{OverallScore: 0, FearGreedIndex: 50, Date: time.Now()}, nil
		}
		return nil, err
	}
	return &sentiment, nil
}

func (s *Service) GetAssetSentiment(ctx context.Context, assetID uuid.UUID, days int) ([]AssetSentiment, error) {
	var sentiments []AssetSentiment
	err := s.db.Where("asset_id = ? AND date >= ?", assetID, time.Now().AddDate(0, 0, -days)).
		Order("date DESC").
		Find(&sentiments).Error
	return sentiments, err
}

func (s *Service) GetRecentNews(ctx context.Context, limit int) ([]NewsSentiment, error) {
	var news []NewsSentiment
	err := s.db.Order("published_at DESC").Limit(limit).Find(&news).Error
	return news, err
}

func (s *Service) GetNewsBySymbol(ctx context.Context, symbol string, limit int) ([]NewsSentiment, error) {
	var news []NewsSentiment
	err := s.db.Where("symbols LIKE ?", "%"+symbol+"%").
		Order("published_at DESC").
		Limit(limit).
		Find(&news).Error
	return news, err
}

// GNews Provider
type GNewsProvider struct {
	apiKey string
	client *http.Client
}

func NewGNewsProvider() *GNewsProvider {
	return &GNewsProvider{
		apiKey: "[REDACTED]", // User must provide
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *GNewsProvider) Name() string { return "gnews" }

func (p *GNewsProvider) FetchNews(ctx context.Context, query string, limit int) ([]RawNews, error) {
	if p.apiKey == "[REDACTED]" || p.apiKey == "" {
		return nil, fmt.Errorf("GNews API key not configured")
	}
	
	url := fmt.Sprintf("https://gnews.io/api/v4/search?q=%s&lang=pt&max=%d&apikey=%s",
		url.QueryEscape(query), limit, p.apiKey)
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result struct {
		Articles []struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			URL         string `json:"url"`
			Source      struct {
				Name string `json:"name"`
			} `json:"source"`
			PublishedAt string `json:"publishedAt"`
		} `json:"articles"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	news := make([]RawNews, 0, len(result.Articles))
	for _, a := range result.Articles {
		pubTime, _ := time.Parse(time.RFC3339, a.PublishedAt)
		news = append(news, RawNews{
			Title:       a.Title,
			Summary:     a.Description,
			URL:         a.URL,
			Source:      a.Source.Name,
			PublishedAt: pubTime,
			Symbols:     extractSymbols(a.Title + " " + a.Description),
		})
	}
	
	return news, nil
}

// NewsAPI Provider
type NewsAPIProvider struct {
	apiKey string
	client *http.Client
}

func NewNewsAPIProvider() *NewsAPIProvider {
	return &NewsAPIProvider{
		apiKey: "[REDACTED]", // User must provide
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *NewsAPIProvider) Name() string { return "newsapi" }

func (p *NewsAPIProvider) FetchNews(ctx context.Context, query string, limit int) ([]RawNews, error) {
	if p.apiKey == "[REDACTED]" || p.apiKey == "" {
		return nil, fmt.Errorf("NewsAPI key not configured")
	}
	
	url := fmt.Sprintf("https://newsapi.org/v2/everything?q=%s&language=pt&pageSize=%d&apiKey=%s",
		url.QueryEscape(query), limit, p.apiKey)
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result struct {
		Articles []struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			URL         string `json:"url"`
			Source      struct {
				Name string `json:"name"`
			} `json:"source"`
			PublishedAt string `json:"publishedAt"`
		} `json:"articles"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	news := make([]RawNews, 0, len(result.Articles))
	for _, a := range result.Articles {
		pubTime, _ := time.Parse(time.RFC3339, a.PublishedAt)
		news = append(news, RawNews{
			Title:       a.Title,
			Summary:     a.Description,
			URL:         a.URL,
			Source:      a.Source.Name,
			PublishedAt: pubTime,
			Symbols:     extractSymbols(a.Title + " " + a.Description),
		})
	}
	
	return news, nil
}

func extractSymbols(text string) []string {
	// Simple extraction of Brazilian tickers (4 letters + 1 number) and US tickers
	// In production, use a proper symbol dictionary
	knownSymbols := []string{
		"PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3", "WEGE3", "RENT3", "BBAS3",
		"MGLU3", "LREN3", "HAPV3", "RADL3", "SUZB3", "GGBR4", "CSNA3", "USIM5",
		"AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM",
		"XP", "NU", "BDR", "IVVB11", "BOVA11", "SMAL11",
	}
	
	textUpper := strings.ToUpper(text)
	found := make([]string, 0)
	seen := make(map[string]bool)
	
	for _, sym := range knownSymbols {
		if strings.Contains(textUpper, sym) && !seen[sym] {
			seen[sym] = true
			// Add .SA for Brazilian stocks
			if len(sym) == 5 && sym[4] >= '0' && sym[4] <= '9' {
				found = append(found, sym+".SA")
			} else {
				found = append(found, sym)
			}
		}
	}
	
	return found
}
