package middleware

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// #region agent log
func debugAuthLog(location, message string, data map[string]any) {
	f, err := os.OpenFile(`C:\Users\admin\Desktop\summer_work\krunchies-full-setup\debug-ec6f7f.log`, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	entry := map[string]any{
		"sessionId": "ec6f7f",
		"location":  location,
		"message":   message,
		"data":      data,
		"timestamp": time.Now().UnixMilli(),
	}
	b, _ := json.Marshal(entry)
	_, _ = f.Write(append(b, '\n'))
}

// #endregion

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
			// #region agent log
			debugAuthLog("auth.go:JWTAuth", "token parse failed", map[string]any{
				"hypothesisId": "A/B/C",
				"path":         c.Request.Method + " " + c.Request.URL.Path,
				"parseError":   err.Error(),
				"tokenLen":     len(token),
				"authHasBearer": strings.HasPrefix(auth, "Bearer "),
				"secretLen":    len(secret),
			})
			// #endregion
			utils.Error(c, http.StatusUnauthorized, "invalid token")
			c.Abort()
			return
		}

		if len(allowed) > 0 && !allowed[claims.UserType] {
			// #region agent log
			debugAuthLog("auth.go:JWTAuth", "user type forbidden", map[string]any{
				"hypothesisId": "D",
				"path":         c.Request.Method + " " + c.Request.URL.Path,
				"userType":     claims.UserType,
			})
			// #endregion
			utils.Error(c, http.StatusForbidden, "forbidden")
			c.Abort()
			return
		}
		// #region agent log
		debugAuthLog("auth.go:JWTAuth", "token accepted", map[string]any{
			"hypothesisId": "none",
			"path":         c.Request.Method + " " + c.Request.URL.Path,
			"userType":     claims.UserType,
		})
		// #endregion

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
