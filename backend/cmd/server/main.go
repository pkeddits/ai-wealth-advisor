package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ai-wealth-advisor/backend/internal/alert"
	"ai-wealth-advisor/backend/internal/ai"
	"ai-wealth-advisor/backend/internal/analytics"
	"ai-wealth-advisor/backend/internal/asset"
	"ai-wealth-advisor/backend/internal/auth"
	"ai-wealth-advisor/backend/internal/config"
	"ai-wealth-advisor/backend/internal/database"
	"ai-wealth-advisor/backend/internal/marketdata"
	"ai-wealth-advisor/backend/internal/middleware"
	"ai-wealth-advisor/backend/internal/portfolio"
	"ai-wealth-advisor/backend/internal/routes"
	"ai-wealth-advisor/backend/internal/sentiment"
	"ai-wealth-advisor/backend/internal/simulation"
	"ai-wealth-advisor/backend/internal/transaction"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	
	// Database
	db, err := database.NewPostgresDB(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	
	// Auto migrate
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	
	// Initialize services
	authSvc := auth.NewService(db, &cfg.JWT)
	authH := auth.NewHandler(authSvc)
	
	assetSvc := asset.NewService(db)
	assetH := asset.NewHandler(assetSvc)
	
	portfolioSvc := portfolio.NewService(db, assetSvc)
	portfolioH := portfolio.NewHandler(portfolioSvc)
	
	transactionSvc := transaction.NewService(db, portfolioSvc, assetSvc)
	transactionH := transaction.NewHandler(transactionSvc)
	
	marketSvc := marketdata.NewService(db, assetSvc, &cfg.MarketData)
	marketH := marketdata.NewHandler(marketSvc)
	
	analyticsSvc := analytics.NewService(db, portfolioSvc)
	analyticsH := analytics.NewHandler(analyticsSvc)
	
	aiSvc := ai.NewService(db, &cfg.OpenAI, portfolioSvc, assetSvc, analyticsSvc, nil)
	aiH := ai.NewHandler(aiSvc)
	
	sentimentSvc := sentiment.NewService(db)
	sentimentH := sentiment.NewHandler(sentimentSvc)
	
	simulationSvc := simulation.NewService(db, portfolioSvc, analyticsSvc)
	simulationH := simulation.NewHandler(simulationSvc)
	
	alertSvc := alert.NewService(db, assetSvc, portfolioSvc, marketSvc, sentimentSvc, nil, nil)
	alertH := alert.NewHandler(alertSvc)
	
	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.RateLimitMiddleware())
	
	routes.SetupRoutes(
		r,
		authSvc, authH,
		assetSvc, assetH,
		portfolioSvc, portfolioH,
		transactionSvc, transactionH,
		marketSvc, marketH,
		analyticsSvc, analyticsH,
		aiSvc, aiH,
		sentimentSvc, sentimentH,
		simulationSvc, simulationH,
		alertSvc, alertH,
	)
	
	// Start server
	srv := &http.Server{
		Addr:         ":" + string(rune(cfg.Server.Port)),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}
	
	go func() {
		log.Printf("Server starting on port %d", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()
	
	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
	
	// TODO: Stop background jobs
	
	log.Println("Server exited")
}
