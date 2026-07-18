package middleware

import (
	"net/http"
	"strings"

	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func JWTAuth(secret string, allowedUserTypes ...string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, t := range allowedUserTypes {
		allowed[t] = true
	}

	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			utils.Error(c, http.StatusUnauthorized, "missing authorization token")
			c.Abort()
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		claims, err := utils.ParseToken(secret, token)
		if err != nil {
			utils.Error(c, http.StatusUnauthorized, "invalid token")
			c.Abort()
			return
		}

		if len(allowed) > 0 && !allowed[claims.UserType] {
			utils.Error(c, http.StatusForbidden, "forbidden")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_type", claims.UserType)
		c.Next()
	}
}
