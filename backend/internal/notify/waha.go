package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"backend/internal/utils"

	"github.com/google/uuid"
)

const defaultWahaSession = "default"

// Always also notify this shop phone (03000128562) for website orders.
const extraOwnerPhonePK = "923000128562"

var missingEnvOnce sync.Once

// OrderAlert is the WhatsApp payload for a new website order.
type OrderAlert struct {
	OrderID       uuid.UUID
	OrderNumber   string
	CustomerName  string
	Phone         string
	Address       string
	LocationName  string
	PaymentMethod string
	OrderNotes    string
	Subtotal      int
	Discount      int
	Delivery      int
	CODFee        int
	GrandTotal    int
	Items         []OrderAlertItem
}

type OrderAlertItem struct {
	Name         string
	Size         string
	Quantity     int
	LineTotal    int
	Instructions string
}

// wahaSendTextPayload is the body WAHA's /api/sendText endpoint expects.
// See https://waha.devlike.pro — WAHA is a self-hosted WhatsApp HTTP API
// (wraps a real WhatsApp Web session), so unlike Meta's Cloud API it has no
// approved-template system: every message is just plain text to a chat id.
type wahaSendTextPayload struct {
	Session string `json:"session"`
	ChatID  string `json:"chatId"`
	Text    string `json:"text"`
}

// NotifyWebsiteOrderAsync sends a detailed WhatsApp alert to all configured owner phones.
// Safe after commit: goroutine, never fails the order, no-ops if WAHA env is missing.
func NotifyWebsiteOrderAsync(alert OrderAlert) {
	go notifyWebsiteOrder(alert)
}

// NotifyNewOrderAsync keeps a minimal fallback for older call sites / tests.
func NotifyNewOrderAsync(orderID uuid.UUID, grandTotal int) {
	NotifyWebsiteOrderAsync(OrderAlert{
		OrderID:    orderID,
		GrandTotal: grandTotal,
	})
}

func notifyWebsiteOrder(alert OrderAlert) {
	baseURL, apiKey, session, ok := wahaConfig()
	phones := ownerPhones()
	if !ok || len(phones) == 0 {
		missingEnvOnce.Do(func() {
			log.Printf("whatsapp notify: skipped — set WAHA_BASE_URL and WHATSAPP_OWNER_PHONE on Render")
		})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	body := FormatOrderAlert(alert)
	for _, to := range phones {
		if err := sendWahaText(client, baseURL, apiKey, session, to, body); err != nil {
			log.Printf("whatsapp notify: send failed for order %s to %s: %v", alert.OrderID, to, err)
			continue
		}
		log.Printf("whatsapp notify: sent for order %s to %s", alert.OrderID, to)
	}
}

// SendWhatsAppText sends a plain-text WhatsApp message to one recipient.
// Used for password-reset replies (not order alerts).
func SendWhatsAppText(to, body string) error {
	baseURL, apiKey, session, ok := wahaConfig()
	if !ok {
		log.Printf("whatsapp send: not configured (set WAHA_BASE_URL)")
		return fmt.Errorf("waha not configured")
	}
	normalized := utils.NormalizePhone(to)
	if normalized == "" {
		log.Printf("whatsapp send: invalid phone %q", to)
		return fmt.Errorf("invalid phone")
	}
	log.Printf("whatsapp send: to=%q (from %q) session=%s", normalized, to, session)
	client := &http.Client{Timeout: 10 * time.Second}
	if err := sendWahaText(client, baseURL, apiKey, session, normalized, body); err != nil {
		log.Printf("whatsapp send: FAILED to %q: %v", normalized, err)
		return err
	}
	log.Printf("whatsapp send: SUCCESS to %q", normalized)
	return nil
}

// NormalizePhone converts local PK numbers to international digits for WhatsApp API.
func NormalizePhone(raw string) string {
	return normalizePhone(raw)
}

// sendWahaText posts a free-form text message through the configured WAHA instance.
func sendWahaText(client *http.Client, baseURL, apiKey, session, to, body string) error {
	payload := wahaSendTextPayload{
		Session: session,
		ChatID:  to + "@c.us",
		Text:    body,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, baseURL+"/api/sendText", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("X-Api-Key", apiKey)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("waha API %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return nil
}

// wahaConfig reads the WAHA connection settings from the environment.
// ok is false when WAHA_BASE_URL is unset — nothing to notify, don't try.
func wahaConfig() (baseURL, apiKey, session string, ok bool) {
	baseURL = strings.TrimRight(strings.TrimSpace(os.Getenv("WAHA_BASE_URL")), "/")
	apiKey = strings.TrimSpace(os.Getenv("WAHA_API_KEY"))
	session = strings.TrimSpace(os.Getenv("WAHA_SESSION"))
	if session == "" {
		session = defaultWahaSession
	}
	return baseURL, apiKey, session, baseURL != ""
}

// FormatOrderAlert renders the human-readable order alert body shown to the shop.
// Exported so Telegram (and other channels) can reuse it.
func FormatOrderAlert(a OrderAlert) string {
	ref := strings.TrimSpace(a.OrderNumber)
	if ref == "" {
		ref = a.OrderID.String()
	}
	var b strings.Builder
	b.WriteString("New website order\n")
	b.WriteString(fmt.Sprintf("Order: %s\n", ref))
	if a.CustomerName != "" {
		b.WriteString(fmt.Sprintf("Customer: %s\n", a.CustomerName))
	}
	if a.Phone != "" {
		b.WriteString(fmt.Sprintf("Phone: %s\n", a.Phone))
	}
	if a.Address != "" {
		b.WriteString(fmt.Sprintf("Address: %s\n", a.Address))
	}
	if a.LocationName != "" {
		b.WriteString(fmt.Sprintf("Area: %s\n", a.LocationName))
	}
	if a.PaymentMethod != "" {
		b.WriteString(fmt.Sprintf("Payment: %s\n", strings.ToUpper(a.PaymentMethod)))
	}
	if len(a.Items) > 0 {
		b.WriteString("\nItems:\n")
		for _, it := range a.Items {
			label := it.Name
			if it.Size != "" {
				label += " (" + it.Size + ")"
			}
			b.WriteString(fmt.Sprintf("- %dx %s - Rs.%d\n", it.Quantity, label, it.LineTotal))
			if strings.TrimSpace(it.Instructions) != "" {
				b.WriteString(fmt.Sprintf("  note: %s\n", strings.TrimSpace(it.Instructions)))
			}
		}
	}
	b.WriteString("\n")
	b.WriteString(fmt.Sprintf("Subtotal: Rs.%d\n", a.Subtotal))
	if a.Discount > 0 {
		b.WriteString(fmt.Sprintf("Discount: -Rs.%d\n", a.Discount))
	}
	if a.Delivery > 0 {
		b.WriteString(fmt.Sprintf("Delivery: Rs.%d\n", a.Delivery))
	}
	if a.CODFee > 0 {
		b.WriteString(fmt.Sprintf("COD fee: Rs.%d\n", a.CODFee))
	}
	b.WriteString(fmt.Sprintf("Total: Rs.%d\n", a.GrandTotal))
	if strings.TrimSpace(a.OrderNotes) != "" {
		b.WriteString(fmt.Sprintf("Notes: %s\n", strings.TrimSpace(a.OrderNotes)))
	}
	return b.String()
}

// ownerPhones = WHATSAPP_OWNER_PHONE (comma-separated) + always 03000128562.
func ownerPhones() []string {
	raw := os.Getenv("WHATSAPP_OWNER_PHONE")
	if extra := strings.TrimSpace(os.Getenv("WHATSAPP_OWNER_PHONES")); extra != "" {
		if raw != "" {
			raw = raw + "," + extra
		} else {
			raw = extra
		}
	}
	seen := map[string]bool{}
	out := make([]string, 0, 4)
	add := func(p string) {
		p = normalizePhone(p)
		if p == "" || seen[p] {
			return
		}
		seen[p] = true
		out = append(out, p)
	}
	for _, part := range strings.Split(raw, ",") {
		add(part)
	}
	add(extraOwnerPhonePK)
	return out
}

func normalizePhone(raw string) string {
	return utils.NormalizePhone(raw)
}
