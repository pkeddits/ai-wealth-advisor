package marketdata

import (
	"context"
	"errors"
	"sync"
	"time"

	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/config"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrNoProvider = errors.New("no market data provider configured")
)

type Service struct {
	db            *gorm.DB
	assetService  *asset.Service
	provider      Provider
	config        *config.MarketDataConfig
	cache         map[string]cachedQuote
	cacheMu       sync.RWMutex
	cacheTTL      time.Duration
}

type cachedQuote struct {
	quote    *Quote
	expires  time.Time
}

func NewService(db *gorm.DB, assetSvc *asset.Service, cfg *config.MarketDataConfig) *Service {
	s := &Service{
		db:           db,
		assetService: assetSvc,
		config:       cfg,
		cache:        make(map[string]cachedQuote),
		cacheTTL:     60 * time.Second, // 1 minute cache
	}
	
	// Initialize provider
	switch cfg.Provider {
	case "yfinance":
		s.provider = NewYFinanceProvider()
	case "alphavantage":
		// s.provider = NewAlphaVantageProvider(cfg.AlphaVantageKey)
	case "twelvedata":
		// s.provider = NewTwelveDataProvider(cfg.TwelveDataKey)
	default:
		s.provider = NewYFinanceProvider()
	}
	
	return s
}

func (s *Service) GetQuote(ctx context.Context, symbol string) (*Quote, error) {
	// Check cache
	s.cacheMu.RLock()
	if cached, ok := s.cache[symbol]; ok && time.Now().Before(cached.expires) {
		s.cacheMu.RUnlock()
		return cached.quote, nil
	}
	s.cacheMu.RUnlock()
	
	// Fetch from provider
	if s.provider == nil {
		return nil, ErrNoProvider
	}
	
	quote, err := s.provider.GetQuote(ctx, symbol)
	if err != nil {
		return nil, err
	}
	
	// Update cache
	s.cacheMu.Lock()
	s.cache[symbol] = cachedQuote{
		quote:   quote,
		expires: time.Now().Add(s.cacheTTL),
	}
	s.cacheMu.Unlock()
	
	return quote, nil
}

func (s *Service) GetCandles(ctx context.Context, symbol string, interval string, days int) ([]Candle, error) {
	if s.provider == nil {
		return nil, ErrNoProvider
	}
	return s.provider.GetCandles(ctx, symbol, interval, days)
}

func (s *Service) GetFundamentals(ctx context.Context, symbol string) (*Fundamentals, error) {
	if s.provider == nil {
		return nil, ErrNoProvider
	}
	return s.provider.GetFundamentals(ctx, symbol)
}

func (s *Service) Search(ctx context.Context, query string) ([]SearchResult, error) {
	if s.provider == nil {
		return nil, ErrNoProvider
	}
	return s.provider.Search(ctx, query)
}

func (s *Service) RefreshAssetPrices(ctx context.Context, assetIDs []uuid.UUID) error {
	for _, id := range assetIDs {
		a, err := s.assetService.Get(ctx, id)
		if err != nil {
			continue
		}
		
		quote, err := s.GetQuote(ctx, a.Symbol)
		if err != nil {
			continue
		}
		
		// Save price to database
		price := asset.Price{
			AssetID:  a.ID,
			Date:     time.Unix(quote.Timestamp, 0).Truncate(24 * time.Hour),
			Open:     quote.Open,
			High:     quote.High,
			Low:      quote.Low,
			Close:    quote.Price,
			Volume:   quote.Volume,
			AdjClose: quote.Price,
		}
		s.assetService.UpdatePrice(ctx, a.ID, price)
		
		// Update asset current price in cache
		s.cacheMu.Lock()
		s.cache[a.Symbol] = cachedQuote{
			quote:   quote,
			expires: time.Now().Add(s.cacheTTL),
		}
		s.cacheMu.Unlock()
	}
	return nil
}

func (s *Service) RefreshAllPrices(ctx context.Context) error {
	// Get all active assets
	assets, _, err := s.assetService.List(ctx, "", "", "", 1000, 0)
	if err != nil {
		return err
	}
	
	ids := make([]uuid.UUID, len(assets))
	for i, a := range assets {
		ids[i] = a.ID
	}
	
	return s.RefreshAssetPrices(ctx, ids)
}
