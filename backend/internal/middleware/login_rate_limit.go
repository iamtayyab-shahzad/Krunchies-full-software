package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

const (
	loginMaxFailures = 5
	loginWindow      = 15 * time.Minute
	loginBaseLockout = 2 * time.Minute
	loginMaxLockout  = 30 * time.Minute
)

type loginAttempt struct {
	failures    int
	windowStart time.Time
	lockedUntil time.Time
}

type loginRateLimiter struct {
	mu    sync.Mutex
	byKey map[string]*loginAttempt
}

var loginLimiter = &loginRateLimiter{
	byKey: make(map[string]*loginAttempt),
}

func loginClientIP(c *gin.Context) string {
	if xff := strings.TrimSpace(c.GetHeader("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if xri := strings.TrimSpace(c.GetHeader("X-Real-IP")); xri != "" {
		return xri
	}
	return c.ClientIP()
}

func loginKey(c *gin.Context, account string) string {
	acct := strings.ToLower(strings.TrimSpace(account))
	if acct == "" {
		acct = "_"
	}
	return loginClientIP(c) + "|" + acct
}

func (l *loginRateLimiter) check(key string) (blocked bool, retryAfter time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	row := l.byKey[key]
	if row == nil {
		return false, 0
	}
	if now.Before(row.lockedUntil) {
		return true, row.lockedUntil.Sub(now)
	}
	if now.Sub(row.windowStart) > loginWindow {
		delete(l.byKey, key)
		return false, 0
	}
	return false, 0
}

func (l *loginRateLimiter) recordFailure(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	row := l.byKey[key]
	if row == nil || now.Sub(row.windowStart) > loginWindow {
		l.byKey[key] = &loginAttempt{failures: 1, windowStart: now}
		return
	}
	row.failures++
	if row.failures >= loginMaxFailures {
		mult := row.failures - loginMaxFailures + 1
		lock := time.Duration(mult) * loginBaseLockout
		if lock > loginMaxLockout {
			lock = loginMaxLockout
		}
		row.lockedUntil = now.Add(lock)
	}
}

func (l *loginRateLimiter) recordSuccess(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.byKey, key)
}

// CheckLoginAllowed returns false when this IP+account is temporarily locked.
// Call after binding credentials. On false, a 429 response was already written.
func CheckLoginAllowed(c *gin.Context, account string) bool {
	key := loginKey(c, account)
	if blocked, retry := loginLimiter.check(key); blocked {
		secs := int(retry.Seconds())
		if secs < 1 {
			secs = 1
		}
		c.Header("Retry-After", strconv.Itoa(secs))
		utils.Error(c, http.StatusTooManyRequests,
			"too many failed login attempts — try again in a few minutes")
		return false
	}
	return true
}

// RecordLoginFailure increments the failure counter for IP+account.
func RecordLoginFailure(c *gin.Context, account string) {
	loginLimiter.recordFailure(loginKey(c, account))
}

// RecordLoginSuccess clears the failure window after a successful login.
func RecordLoginSuccess(c *gin.Context, account string) {
	loginLimiter.recordSuccess(loginKey(c, account))
}

// ResetLoginRateLimiterForTests clears in-memory state between unit tests.
func ResetLoginRateLimiterForTests() {
	loginLimiter.mu.Lock()
	defer loginLimiter.mu.Unlock()
	loginLimiter.byKey = make(map[string]*loginAttempt)
}
