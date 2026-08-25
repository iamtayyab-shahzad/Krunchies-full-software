package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestLoginRateLimitLocksAfterFailures(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ResetLoginRateLimiterForTests()

	makeCtx := func() *gin.Context {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/auth/staff/login", nil)
		c.Request.RemoteAddr = "10.0.0.9:1234"
		return c
	}

	account := "staff"
	for i := 0; i < 5; i++ {
		c := makeCtx()
		if !CheckLoginAllowed(c, account) {
			t.Fatalf("should not lock before 5 failures (attempt %d)", i+1)
		}
		RecordLoginFailure(c, account)
	}

	c := makeCtx()
	if CheckLoginAllowed(c, account) {
		t.Fatal("expected lockout after 5 failures")
	}
	if c.Writer.Status() != http.StatusTooManyRequests {
		t.Fatalf("want 429, got %d", c.Writer.Status())
	}

	RecordLoginSuccess(makeCtx(), account)
	if !CheckLoginAllowed(makeCtx(), account) {
		t.Fatal("success should clear lockout")
	}
}
