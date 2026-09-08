package notify

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRevalidateWebsiteMenu_DebouncedSingleCall(t *testing.T) {
	var hits atomic.Int32
	var lastReason string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-revalidate-secret") != "test-secret" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		hits.Add(1)
		buf := make([]byte, 256)
		n, _ := r.Body.Read(buf)
		lastReason = string(buf[:n])
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	t.Setenv("WEBSITE_REVALIDATE_URL", srv.URL+"/api/revalidate")
	t.Setenv("REVALIDATE_SECRET", "test-secret")

	RevalidateWebsiteMenu("product", "id-1")
	RevalidateWebsiteMenu("product size", "id-2")
	RevalidateWebsiteMenu("category", "id-3")

	deadline := time.Now().Add(4 * time.Second)
	for time.Now().Before(deadline) {
		if hits.Load() >= 1 {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	// Wait past debounce window for extras
	time.Sleep(isrDebounce + 200*time.Millisecond)

	if got := hits.Load(); got != 1 {
		t.Fatalf("expected 1 debounced revalidate call, got %d", got)
	}
	if !strings.Contains(lastReason, "category") && !strings.Contains(lastReason, "product") {
		t.Fatalf("unexpected body: %s", lastReason)
	}
}

func TestRevalidateWebsiteMenu_SkipWithoutEnv(t *testing.T) {
	os.Unsetenv("WEBSITE_REVALIDATE_URL")
	os.Unsetenv("REVALIDATE_SECRET")
	// Should not panic
	doRevalidateWebsiteMenu("noop-test")
}
