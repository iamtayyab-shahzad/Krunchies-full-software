package notify

import (
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
	msg := formatOrderAlert(OrderAlert{
		OrderNumber:   "KR-TEST123",
		CustomerName:  "Ali",
		Phone:         "03001234567",
		Address:       "Street 1",
		LocationName:  "Cantt",
		PaymentMethod: "cod",
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
		"Total: Rs.1900",
		"cold",
	} {
		if !strings.Contains(msg, want) {
			t.Fatalf("message missing %q:\n%s", want, msg)
		}
	}
}

func TestBuildWebsiteOrderTemplatePayload(t *testing.T) {
	alert := OrderAlert{
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
		},
	}
	payload := buildWebsiteOrderTemplatePayload("923001234567", alert)
	if payload.Type != "template" {
		t.Fatalf("type=%s", payload.Type)
	}
	if payload.Template.Name != websiteOrderTemplateName {
		t.Fatalf("template name=%s", payload.Template.Name)
	}
	if payload.Template.Language.Code != websiteOrderTemplateLang {
		t.Fatalf("lang=%s", payload.Template.Language.Code)
	}
	params := payload.Template.Components[0].Parameters
	if len(params) != 7 {
		t.Fatalf("expected 7 params, got %d", len(params))
	}
	if params[0].Text != "KR-TEST123" || params[5].Text != "COD" {
		t.Fatalf("unexpected params: %+v", params)
	}
	block := params[6].Text
	for _, want := range []string{"Chicken Tikka", "Subtotal: Rs.2000", "Total: Rs.1900", "ring bell"} {
		if !strings.Contains(block, want) {
			t.Fatalf("param7 missing %q:\n%s", want, block)
		}
	}
}
