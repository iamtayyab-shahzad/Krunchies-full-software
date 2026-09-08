package notify

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

const isrDebounce = 1500 * time.Millisecond

var (
	isrMu      sync.Mutex
	isrTimer   *time.Timer
	isrPending string // last reason for log
)

// RevalidateWebsiteMenu asks the Next.js website to purge ISR for / and /menu.
// Debounced so a product edit + several size writes become one request.
// Safe no-op when WEBSITE_REVALIDATE_URL / REVALIDATE_SECRET are unset.
func RevalidateWebsiteMenu(resource, itemID string) {
	reason := strings.TrimSpace(resource)
	if itemID != "" {
		reason = reason + ":" + itemID
	}
	if reason == "" {
		reason = "catalog-change"
	}

	isrMu.Lock()
	defer isrMu.Unlock()
	isrPending = reason
	if isrTimer != nil {
		isrTimer.Stop()
	}
	isrTimer = time.AfterFunc(isrDebounce, func() {
		isrMu.Lock()
		pending := isrPending
		isrPending = ""
		isrTimer = nil
		isrMu.Unlock()
		doRevalidateWebsiteMenu(pending)
	})
}

func doRevalidateWebsiteMenu(reason string) {
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("WEBSITE_REVALIDATE_URL")), "/")
	secret := strings.TrimSpace(os.Getenv("REVALIDATE_SECRET"))
	if base == "" || secret == "" {
		log.Printf(
			"ISR: skip revalidate (set WEBSITE_REVALIDATE_URL + REVALIDATE_SECRET); reason=%s",
			reason,
		)
		return
	}

	endpoint := base
	if !strings.Contains(base, "/api/revalidate") {
		endpoint = base + "/api/revalidate"
	}

	body, _ := json.Marshal(map[string]string{
		"reason": reason,
		"paths":  "/menu,/",
	})

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		log.Printf("ISR: build request failed: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-revalidate-secret", secret)

	client := &http.Client{Timeout: 8 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		log.Printf("ISR: revalidate request failed (%s): %v", reason, err)
		return
	}
	defer res.Body.Close()

	if res.StatusCode >= 300 {
		log.Printf(
			"ISR: revalidate HTTP %d for /menu and / due to catalog change: %s",
			res.StatusCode,
			reason,
		)
		return
	}

	log.Printf("ISR: revalidated /menu and / due to product/category change: %s", reason)
}
