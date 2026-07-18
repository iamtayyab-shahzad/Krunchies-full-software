package middleware

import (
	"log"
	"net/http"

	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func ErrorRecovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		log.Printf("panic recovered: %v", recovered)
		utils.Error(c, http.StatusInternalServerError, "internal server error")
	})
}
