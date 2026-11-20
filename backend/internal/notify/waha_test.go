package notify

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestNotifyNewOrderAsync_NoEnvNoPanic(t *testing.T) {
	NotifyNewOrderAsync(uuid.New(), 1500)
	NotifyWebsiteOrderAsync(OrderAlert{OrderID: uuid.New(), GrandTotal: 1500})
}

func TestNormalizePhone_PakistanLocal(t *testing.T) {
	if got := normalizePhone("03000128562"); got != "923000128562" {
		t.Fatalf("got %s", got)
	}
	if got := normalizePhone("+92 300 0128562"); got != "923000128562" {
		t.Fatalf("got %s", got)
	}
}

func TestOwnerPhones_IncludesExtraAndEnv(t *testing.T) {
	t.Setenv("WHATSAPP_OWNER_PHONE", "03001234567")
	phones := ownerPhones()
	joined := strings.Join(phones, ",")
	if !strings.Contains(joined, "923001234567") {
		t.Fatalf("missing env phone: %v", phones)
	}
	if !strings.Contains(joined, extraOwnerPhonePK) {
		t.Fatalf("missing extra phone: %v", phones)
	}
	t.Setenv("WHATSAPP_OWNER_PHONE", "923000128562")
	phones = ownerPhones()
	count := 0
	for _, p := range phones {
		if p == extraOwnerPhonePK {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected one extra phone, got %v", phones)
	}
}

func TestFormatOrderAlert_IncludesDetails(t *testing.T) {
	msg := FormatOrderAlert(OrderAlert{
		OrderNumber:   "KR-TEST123",
		CustomerName:  "Ali",
		Phone:         "03001234567",
		Address:       "Street 1",
		LocationName:  "Cantt",
		PaymentMethod: "cod",
		OrderNotes:    "ring bell",
		Subtotal:      2000,
		Discount:      200,
		Delivery:      100,
		GrandTotal:    1900,
		Items: []OrderAlertItem{
			{Name: "Chicken Tikka", Size: "Large", Quantity: 1, LineTotal: 1500},
			{Name: "Coke", Size: "1.5L", Quantity: 2, LineTotal: 500, Instructions: "cold"},
		},
	})
	for _, want := range []string{
		"KR-TEST123",
		"Ali",
		"Cantt",
		"Chicken Tikka",
		"COD",
		"Subtotal: Rs.2000",
		"Discount: -Rs.200",
		"Delivery: Rs.100",
		"Total: Rs.1900",
		"Notes: ring bell",
		"cold",
	} {
		if !strings.Contains(msg, want) {
			t.Fatalf("message missing %q:\n%s", want, msg)
		}
	}
}

func TestWahaConfig_RequiresBaseURL(t *testing.T) {
	t.Setenv("WAHA_BASE_URL", "")
	if _, _, _, ok := wahaConfig(); ok {
		t.Fatal("expected ok=false with no WAHA_BASE_URL")
	}

	t.Setenv("WAHA_BASE_URL", "https://waha.example.com/")
	t.Setenv("WAHA_API_KEY", "secret")
	t.Setenv("WAHA_SESSION", "")
	baseURL, apiKey, session, ok := wahaConfig()
	if !ok || baseURL != "https://waha.example.com" || apiKey != "secret" || session != defaultWahaSession {
		t.Fatalf("got baseURL=%q apiKey=%q session=%q ok=%v", baseURL, apiKey, session, ok)
	}
}

func TestSendWahaText_PostsExpectedPayload(t *testing.T) {
	var gotPath, gotAPIKey string
	var gotBody wahaSendTextPayload
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAPIKey = r.Header.Get("X-Api-Key")
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	err := sendWahaText(server.Client(), server.URL, "secret", "default", "923001234567", "hello")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotPath != "/api/sendText" {
		t.Fatalf("path=%s", gotPath)
	}
	if gotAPIKey != "secret" {
		t.Fatalf("api key=%s", gotAPIKey)
	}
	if gotBody.Session != "default" || gotBody.ChatID != "923001234567@c.us" || gotBody.Text != "hello" {
		t.Fatalf("unexpected payload: %+v", gotBody)
	}
}
