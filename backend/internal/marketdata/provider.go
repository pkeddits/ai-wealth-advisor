package marketdata

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Provider interface {
	GetQuote(ctx context.Context, symbol string) (*Quote, error)
	GetCandles(ctx context.Context, symbol string, interval string, days int) ([]Candle, error)
	GetFundamentals(ctx context.Context, symbol string) (*Fundamentals, error)
	Search(ctx context.Context, query string) ([]SearchResult, error)
	Name() string
}

type Quote struct {
	Symbol        string  `json:"symbol"`
	Price         float64 `json:"price"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"change_percent"`
	Volume        float64 `json:"volume"`
	High          float64 `json:"high"`
	Low           float64 `json:"low"`
	Open          float64 `json:"open"`
	PrevClose     float64 `json:"prev_close"`
	Timestamp     int64   `json:"timestamp"`
	Currency      string  `json:"currency"`
	Exchange      string  `json:"exchange"`
	Name          string  `json:"name"`
}

type Candle struct {
	Timestamp int64   `json:"timestamp"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    float64 `json:"volume"`
}

type Fundamentals struct {
	Symbol            string  `json:"symbol"`
	MarketCap         float64 `json:"market_cap"`
	PE                float64 `json:"pe"`
	PB                float64 `json:"pb"`
	DividendYield     float64 `json:"dividend_yield"`
	ROE               float64 `json:"roe"`
	ROIC              float64 `json:"roic"`
	DebtToEquity      float64 `json:"debt_to_equity"`
	CurrentRatio      float64 `json:"current_ratio"`
	RevenueGrowth     float64 `json:"revenue_growth"`
	EarningsGrowth    float64 `json:"earnings_growth"`
	FreeCashFlowYield float64 `json:"fcf_yield"`
	PayoutRatio       float64 `json:"payout_ratio"`
	Beta              float64 `json:"beta"`
	SharesOutstanding float64 `json:"shares_outstanding"`
}

type SearchResult struct {
	Symbol   string `json:"symbol"`
	Name     string `json:"name"`
	Exchange string `json:"exchange"`
	Type     string `json:"type"`
	Currency string `json:"currency"`
}

var ErrRateLimited = fmt.Errorf("rate limited")
var ErrNotFound = fmt.Errorf("not found")
