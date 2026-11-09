package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		log.Error().
			Interface("error", recovered).
			Str("path", c.Request.URL.Path).
			Msg("Panic recovered")
		c.JSON(500, gin.H{"error": "Internal server error"})
	})
}
