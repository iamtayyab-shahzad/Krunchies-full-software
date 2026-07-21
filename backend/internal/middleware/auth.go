package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

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
			// #region agent log
			func() {
				if f, ferr := os.OpenFile(`C:\Users\admin\Desktop\summer_work\krunchies-full-setup\debug-b5f52e.log`, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); ferr == nil {
					defer f.Close()
					fmt.Fprintf(f, "{\"sessionId\":\"b5f52e\",\"runId\":\"post-fix\",\"hypothesisId\":\"B\",\"location\":\"auth.go:21\",\"message\":\"JWTAuth rejected request (missing token)\",\"data\":{\"path\":\"%s\",\"method\":\"%s\"},\"timestamp\":%d}\n", c.Request.URL.Path, c.Request.Method, time.Now().UnixMilli())
				}
			}()
			// #endregion
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

// OptionalJWT attaches valid authentication claims when a token is supplied,
// while allowing unauthenticated requests such as guest checkout.
func OptionalJWT(secret string, allowedUserTypes ...string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, t := range allowedUserTypes {
		allowed[t] = true
	}

	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.Next()
			return
		}
		if !strings.HasPrefix(auth, "Bearer ") {
			utils.Error(c, http.StatusUnauthorized, "invalid authorization token")
			c.Abort()
			return
		}

		claims, err := utils.ParseToken(secret, strings.TrimPrefix(auth, "Bearer "))
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
