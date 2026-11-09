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

type YFinanceProvider struct {
	client *http.Client
	baseURL string
}

func NewYFinanceProvider() *YFinanceProvider {
	return &YFinanceProvider{
		client: &http.Client{Timeout: 10 * time.Second},
		baseURL: "https://query1.finance.yahoo.com",
	}
}

func (p *YFinanceProvider) Name() string {
	return "yfinance"
}

func (p *YFinanceProvider) GetQuote(ctx context.Context, symbol string) (*Quote, error) {
	// Yahoo Finance uses different symbol formats for different markets
	// For Brazilian stocks: PETR4.SA, for US: AAPL
	yfSymbol := p.normalizeSymbol(symbol)
	
	url := fmt.Sprintf("%s/v8/finance/chart/%s?interval=1d&range=1d", p.baseURL, url.QueryEscape(yfSymbol))
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; AIWealthAdvisor/1.0)")
	
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == 429 {
		return nil, ErrRateLimited
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("yfinance error: %d", resp.StatusCode)
	}
	
	body, _ := io.ReadAll(resp.Body)
	
	var result struct {
		Chart struct {
			Result []struct {
				Meta struct {
					Symbol           string  `json:"symbol"`
					RegularMarketPrice float64 `json:"regularMarketPrice"`
					PreviousClose    float64 `json:"previousClose"`
					RegularMarketChange float64 `json:"regularMarketChange"`
					RegularMarketChangePercent float64 `json:"regularMarketChangePercent"`
					RegularMarketVolume float64 `json:"regularMarketVolume"`
					RegularMarketDayHigh float64 `json:"regularMarketDayHigh"`
					RegularMarketDayLow float64 `json:"regularMarketDayLow"`
					RegularMarketOpen float64 `json:"regularMarketOpen"`
					Currency         string  `json:"currency"`
					ExchangeName     string  `json:"exchangeName"`
					LongName         string  `json:"longName"`
					RegularMarketTime int64   `json:"regularMarketTime"`
				} `json:"meta"`
				Timestamp []int64 `json:"timestamp"`
				Indicators struct {
					Quote []struct {
						Open   []float64 `json:"open"`
						High   []float64 `json:"high"`
						Low    []float64 `json:"low"`
						Close  []float64 `json:"close"`
						Volume []float64 `json:"volume"`
					} `json:"quote"`
				} `json:"indicators"`
			} `json:"result"`
			Error interface{} `json:"error"`
		} `json:"chart"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	if len(result.Chart.Result) == 0 {
		return nil, ErrNotFound
	}
	
	meta := result.Chart.Result[0].Meta
	quote := &Quote{
		Symbol:        meta.Symbol,
		Price:         meta.RegularMarketPrice,
		Change:        meta.RegularMarketChange,
		ChangePercent: meta.RegularMarketChangePercent,
		Volume:        meta.RegularMarketVolume,
		High:          meta.RegularMarketDayHigh,
		Low:           meta.RegularMarketDayLow,
		Open:          meta.RegularMarketOpen,
		PrevClose:     meta.PreviousClose,
		Timestamp:     meta.RegularMarketTime,
		Currency:      meta.Currency,
		Exchange:      meta.ExchangeName,
		Name:          meta.LongName,
	}
	
	return quote, nil
}

func (p *YFinanceProvider) GetCandles(ctx context.Context, symbol string, interval string, days int) ([]Candle, error) {
	yfSymbol := p.normalizeSymbol(symbol)
	
	rangeStr := fmt.Sprintf("%dd", days)
	if days > 730 {
		rangeStr = "max"
	}
	
	url := fmt.Sprintf("%s/v8/finance/chart/%s?interval=%s&range=%s", p.baseURL, url.QueryEscape(yfSymbol), interval, rangeStr)
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; AIWealthAdvisor/1.0)")
	
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == 429 {
		return nil, ErrRateLimited
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("yfinance error: %d", resp.StatusCode)
	}
	
	body, _ := io.ReadAll(resp.Body)
	
	var result struct {
		Chart struct {
			Result []struct {
				Timestamp []int64 `json:"timestamp"`
				Indicators struct {
					Quote []struct {
						Open   []float64 `json:"open"`
						High   []float64 `json:"high"`
						Low    []float64 `json:"low"`
						Close  []float64 `json:"close"`
						Volume []float64 `json:"volume"`
					} `json:"quote"`
				} `json:"indicators"`
			} `json:"result"`
			Error interface{} `json:"error"`
		} `json:"chart"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	if len(result.Chart.Result) == 0 || len(result.Chart.Result[0].Indicators.Quote) == 0 {
		return nil, ErrNotFound
	}
	
	data := result.Chart.Result[0]
	timestamps := data.Timestamp
	quote := data.Indicators.Quote[0]
	
	candles := make([]Candle, 0, len(timestamps))
	for i, ts := range timestamps {
		if i < len(quote.Close) && quote.Close[i] != 0 {
			candles = append(candles, Candle{
				Timestamp: ts,
				Open:      quote.Open[i],
				High:      quote.High[i],
				Low:       quote.Low[i],
				Close:     quote.Close[i],
				Volume:    quote.Volume[i],
			})
		}
	}
	
	return candles, nil
}

func (p *YFinanceProvider) GetFundamentals(ctx context.Context, symbol string) (*Fundamentals, error) {
	yfSymbol := p.normalizeSymbol(symbol)
	
	url := fmt.Sprintf("%s/v10/finance/quoteSummary/%s?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile", p.baseURL, url.QueryEscape(yfSymbol))
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; AIWealthAdvisor/1.0)")
	
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == 429 {
		return nil, ErrRateLimited
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("yfinance error: %d", resp.StatusCode)
	}
	
	body, _ := io.ReadAll(resp.Body)
	
	var result struct {
		QuoteSummary struct {
			Result []struct {
				SummaryDetail struct {
					MarketCap         jsonValue `json:"marketCap"`
					DividendYield     jsonValue `json:"dividendYield"`
					Beta              jsonValue `json:"beta"`
				} `json:"summaryDetail"`
				DefaultKeyStatistics struct {
					PE                jsonValue `json:"trailingPE"`
					PB                jsonValue `json:"priceToBook"`
					SharesOutstanding jsonValue `json:"sharesOutstanding"`
				} `json:"defaultKeyStatistics"`
				FinancialData struct {
					ROE               jsonValue `json:"returnOnEquity"`
					ROIC              jsonValue `json:"returnOnCapital"`
					DebtToEquity      jsonValue `json:"debtToEquity"`
					CurrentRatio      jsonValue `json:"currentRatio"`
					RevenueGrowth     jsonValue `json:"revenueGrowth"`
					EarningsGrowth    jsonValue `json:"earningsGrowth"`
					FreeCashFlowYield jsonValue `json:"freeCashflowYield"`
					PayoutRatio       jsonValue `json:"payoutRatio"`
				} `json:"financialData"`
			} `json:"result"`
			Error interface{} `json:"error"`
		} `json:"quoteSummary"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	if len(result.QuoteSummary.Result) == 0 {
		return nil, ErrNotFound
	}
	
	r := result.QuoteSummary.Result[0]
	
	f := &Fundamentals{
		Symbol:            symbol,
		MarketCap:         getFloat64(r.SummaryDetail.MarketCap),
		PE:                getFloat64(r.DefaultKeyStatistics.PE),
		PB:                getFloat64(r.DefaultKeyStatistics.PB),
		DividendYield:     getFloat64(r.SummaryDetail.DividendYield) * 100, // Convert to percentage
		ROE:               getFloat64(r.FinancialData.ROE) * 100,
		ROIC:              getFloat64(r.FinancialData.ROIC) * 100,
		DebtToEquity:      getFloat64(r.FinancialData.DebtToEquity),
		CurrentRatio:      getFloat64(r.FinancialData.CurrentRatio),
		RevenueGrowth:     getFloat64(r.FinancialData.RevenueGrowth) * 100,
		EarningsGrowth:    getFloat64(r.FinancialData.EarningsGrowth) * 100,
		FreeCashFlowYield: getFloat64(r.FinancialData.FreeCashFlowYield) * 100,
		PayoutRatio:       getFloat64(r.FinancialData.PayoutRatio) * 100,
		Beta:              getFloat64(r.SummaryDetail.Beta),
		SharesOutstanding: getFloat64(r.DefaultKeyStatistics.SharesOutstanding),
	}
	
	return f, nil
}

func (p *YFinanceProvider) Search(ctx context.Context, query string) ([]SearchResult, error) {
	url := fmt.Sprintf("%s/v1/finance/search?q=%s&quotesCount=10&newsCount=0", p.baseURL, url.QueryEscape(query))
	
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; AIWealthAdvisor/1.0)")
	
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == 429 {
		return nil, ErrRateLimited
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("yfinance error: %d", resp.StatusCode)
	}
	
	body, _ := io.ReadAll(resp.Body)
	
	var result struct {
		Quotes []struct {
			Symbol   string `json:"symbol"`
			ShortName string `json:"shortname"`
			LongName  string `json:"longname"`
			Exchange string `json:"exchange"`
			TypeDisp  string `json:"typeDisp"`
			Currency string `json:"currency"`
		} `json:"quotes"`
	}
	
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	results := make([]SearchResult, 0, len(result.Quotes))
	for _, q := range result.Quotes {
		name := q.LongName
		if name == "" {
			name = q.ShortName
		}
		results = append(results, SearchResult{
			Symbol:   q.Symbol,
			Name:     name,
			Exchange: q.Exchange,
			Type:     q.TypeDisp,
			Currency: q.Currency,
		})
	}
	
	return results, nil
}

func (p *YFinanceProvider) normalizeSymbol(symbol string) string {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	// If it's a Brazilian stock without .SA, add it
	if !strings.Contains(symbol, ".") && len(symbol) >= 4 && len(symbol) <= 6 {
		// Check if it looks like a Brazilian ticker (ends with number)
		lastChar := symbol[len(symbol)-1]
		if lastChar >= '0' && lastChar <= '9' {
			return symbol + ".SA"
		}
	}
	return symbol
}

type jsonValue struct {
	Raw   float64 `json:"raw"`
	Value float64 `json:"value"`
}

func getFloat64(j jsonValue) float64 {
	if j.Raw != 0 {
		return j.Raw
	}
	return j.Value
}
