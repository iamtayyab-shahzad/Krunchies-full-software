package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const graphAPIBase = "https://graph.facebook.com/v21.0"

// Always also notify this shop phone (03000128562) for website orders.
const extraOwnerPhonePK = "923000128562"

var (
	nonDigit       = regexp.MustCompile(`\D+`)
	missingEnvOnce sync.Once
)

// OrderAlert is the WhatsApp text payload for a new website order.
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

type textMessagePayload struct {
	MessagingProduct string `json:"messaging_product"`
	To               string `json:"to"`
	Type             string `json:"type"`
	Text             struct {
		Body string `json:"body"`
	} `json:"text"`
}

// NotifyWebsiteOrderAsync sends a detailed WhatsApp alert to all configured owner phones.
// Safe after commit: goroutine, never fails the order, no-ops if Meta env is missing.
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
	token := strings.TrimSpace(os.Getenv("WHATSAPP_TOKEN"))
	phoneNumberID := strings.TrimSpace(os.Getenv("WHATSAPP_PHONE_NUMBER_ID"))
	phones := ownerPhones()
	if token == "" || phoneNumberID == "" || len(phones) == 0 {
		missingEnvOnce.Do(func() {
			log.Printf(
				"whatsapp notify: skipped — set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_OWNER_PHONE on Render",
			)
		})
		return
	}

	body := formatOrderAlert(alert)
	url := graphAPIBase + "/" + phoneNumberID + "/messages"
	client := &http.Client{Timeout: 10 * time.Second}

	for _, to := range phones {
		if err := sendWhatsAppText(client, url, token, to, body); err != nil {
			log.Printf("whatsapp notify: send failed for order %s to %s: %v", alert.OrderID, to, err)
			continue
		}
		log.Printf("whatsapp notify: sent for order %s to %s", alert.OrderID, to)
	}
}

func sendWhatsAppText(client *http.Client, url, token, to, body string) error {
	payload := textMessagePayload{
		MessagingProduct: "whatsapp",
		To:               to,
		Type:             "text",
	}
	payload.Text.Body = body
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("graph API %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	return nil
}

func formatOrderAlert(a OrderAlert) string {
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
		b.WriteString("Items:\n")
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
	b.WriteString(fmt.Sprintf("Total: Rs.%d", a.GrandTotal))
	if strings.TrimSpace(a.OrderNotes) != "" {
		b.WriteString(fmt.Sprintf("\nNotes: %s", strings.TrimSpace(a.OrderNotes)))
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
	digits := nonDigit.ReplaceAllString(strings.TrimSpace(raw), "")
	if digits == "" {
		return ""
	}
	// Local PK mobile 03XXXXXXXXX → 923XXXXXXXXX
	if strings.HasPrefix(digits, "0") && len(digits) == 11 {
		digits = "92" + digits[1:]
	}
	return digits
}
