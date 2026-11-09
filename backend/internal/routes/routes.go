package routes

import (
	"ai-wealth-advisor/backend/internal/alert"
	"ai-wealth-advisor/backend/internal/ai"
	"ai-wealth-advisor/backend/internal/analytics"
	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/auth"
	"ai-wealth-advisor/backend/internal/marketdata"
	"ai-wealth-advisor/backend/internal/middleware"
	"ai-wealth-advisor/backend/internal/portfolio"
	"ai-wealth-advisor/backend/internal/sentiment"
	"ai-wealth-advisor/backend/internal/simulation"
	"ai-wealth-advisor/backend/internal/transaction"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	r *gin.Engine,
	authSvc *auth.Service,
	authH *auth.Handler,
	assetSvc *asset.Service,
	assetH *asset.Handler,
	portfolioSvc *portfolio.Service,
	portfolioH *portfolio.Handler,
	transactionSvc *transaction.Service,
	transactionH *transaction.Handler,
	marketSvc *marketdata.Service,
	marketH *marketdata.Handler,
	analyticsSvc *analytics.Service,
	analyticsH *analytics.Handler,
	aiSvc *ai.Service,
	aiH *ai.Handler,
	sentimentSvc *sentiment.Service,
	sentimentH *sentiment.Handler,
	simulationSvc *simulation.Service,
	simulationH *simulation.Handler,
	alertSvc *alert.Service,
	alertH *alert.Handler,
) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "ai-wealth-advisor"})
	})
	
	r.GET("/api/v1/market/quote/:symbol", marketH.GetQuote)
	r.GET("/api/v1/market/candles/:symbol", marketH.GetCandles)
	r.GET("/api/v1/market/fundamentals/:symbol", marketH.GetFundamentals)
	r.GET("/api/v1/market/search", marketH.Search)
	
	authGroup := r.Group("/api/v1/auth")
	{
		authGroup.POST("/register", authH.Register)
		authGroup.POST("/login", authH.Login)
		authGroup.POST("/refresh", authH.RefreshToken)
		authGroup.POST("/logout", authH.Logout)
	}
	
	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(authSvc))
	{
		api.GET("/me", authH.Me)
		
		assets := api.Group("/assets")
		{
			assets.GET("", assetH.List)
			assets.GET("/search", assetH.Search)
			assets.GET("/:id", assetH.Get)
			assets.POST("", assetH.Create)
			assets.PUT("/:id", assetH.Update)
			assets.DELETE("/:id", assetH.Delete)
			assets.GET("/:id/prices", assetH.GetPrices)
		}
		
		portfolios := api.Group("/portfolios")
		{
			portfolios.GET("", portfolioH.List)
			portfolios.POST("", portfolioH.Create)
			portfolios.GET("/:id", portfolioH.Get)
			portfolios.PUT("/:id", portfolioH.Update)
			portfolios.DELETE("/:id", portfolioH.Delete)
			portfolios.GET("/:id/positions", portfolioH.GetPositions)
			portfolios.GET("/:id/snapshots", portfolioH.GetSnapshots)
			portfolios.POST("/:id/snapshot", portfolioH.CreateSnapshot)
		}
		
		transactions := api.Group("/transactions")
		{
			transactions.GET("", transactionH.List)
			transactions.POST("", transactionH.Create)
			transactions.GET("/:id", transactionH.Get)
			transactions.PUT("/:id", transactionH.Update)
			transactions.DELETE("/:id", transactionH.Delete)
			transactions.GET("/portfolio/:portfolioId", transactionH.GetByPortfolio)
		}
		
		market := api.Group("/market")
		{
			market.POST("/refresh", marketH.Refresh)
		}
		
		analytics := api.Group("/analytics")
		{
			analytics.GET("/portfolio/:id/risk", analyticsH.GetRiskMetrics)
			analytics.GET("/portfolio/:id/score", analyticsH.GetPortfolioScore)
			analytics.GET("/portfolio/:id/correlation", analyticsH.GetCorrelationMatrix)
			analytics.GET("/asset/:id/score", analyticsH.GetAssetScore)
			analytics.GET("/market/regime", analyticsH.GetMarketRegime)
			analytics.POST("/market/regime", analyticsH.SetMarketRegime)
		}
		
		ai := api.Group("/ai")
		{
			ai.POST("/portfolio/:portfolioId/analyze", aiH.AnalyzePortfolio)
			ai.GET("/portfolio/:portfolioId/recommendations", aiH.GetRecommendations)
			ai.GET("/portfolio/:portfolioId/opportunities", aiH.GetOpportunities)
			ai.GET("/portfolio/:portfolioId/analysis", aiH.GetAnalysis)
			ai.POST("/opportunities/scan", aiH.OpportunityScan)
		}
		
		sentiment := api.Group("/sentiment")
		{
			sentiment.GET("/market", sentimentH.GetMarketSentiment)
			sentiment.GET("/market/history", sentimentH.GetMarketSentimentHistory)
			sentiment.GET("/asset/:assetId", sentimentH.GetAssetSentiment)
			sentiment.GET("/news", sentimentH.GetRecentNews)
			sentiment.GET("/news/:symbol", sentimentH.GetNewsBySymbol)
			sentiment.POST("/news/fetch", sentimentH.FetchNews)
			sentiment.GET("/stats", sentimentH.GetSentimentStats)
		}
		
		simulation := api.Group("/simulation")
		{
			simulation.POST("/portfolio/:portfolioId/monte-carlo", simulationH.RunMonteCarlo)
			simulation.POST("/portfolio/:portfolioId/stress-test", simulationH.RunStressTest)
			simulation.GET("/stress-scenarios", simulationH.GetStressScenarios)
			simulation.POST("/portfolio/:portfolioId/backtest", simulationH.RunBacktest)
			simulation.GET("/portfolio/:portfolioId", simulationH.ListSimulations)
			simulation.GET("/:id", simulationH.GetSimulation)
			simulation.GET("/portfolio/:portfolioId/backtests", simulationH.ListBacktests)
		}
		
		alerts := api.Group("/alerts")
		{
			alerts.GET("", alertH.GetAlerts)
			alerts.POST("", alertH.CreateAlert)
			alerts.GET("/:id", alertH.GetAlert)
			alerts.PUT("/:id", alertH.UpdateAlert)
			alerts.DELETE("/:id", alertH.DeleteAlert)
			alerts.PATCH("/:id/toggle", alertH.ToggleAlert)
			alerts.GET("/:id/triggers", alertH.GetTriggers)
			alerts.POST("/triggers/:triggerId/acknowledge", alertH.AcknowledgeTrigger)
			alerts.GET("/preferences", alertH.GetNotificationPreferences)
			alerts.PUT("/preferences", alertH.UpdateNotificationPreferences)
		}
	}
}
