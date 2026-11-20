package handler

import (
	"encoding/json"
	"testing"
)

func TestExtractWahaMessage(t *testing.T) {
	raw := `{
		"event": "message",
		"payload": {
			"from": "923001234567@c.us",
			"fromMe": false,
			"body": " RESET "
		}
	}`
	var payload wahaWebhookPayload
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatal(err)
	}
	from, text := extractWahaMessage(payload)
	if from != "923001234567" || text != "RESET" {
		t.Fatalf("got %q %q", from, text)
	}
}

func TestExtractWahaMessage_IgnoresOwnOutgoingMessages(t *testing.T) {
	raw := `{
		"event": "message",
		"payload": {
			"from": "923001234567@c.us",
			"fromMe": true,
			"body": "RESET"
		}
	}`
	var payload wahaWebhookPayload
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatal(err)
	}
	from, text := extractWahaMessage(payload)
	if from != "" || text != "" {
		t.Fatalf("expected empty result for fromMe=true, got %q %q", from, text)
	}
}

func TestExtractWahaMessage_IgnoresNonMessageEvents(t *testing.T) {
	raw := `{
		"event": "session.status",
		"payload": {
			"from": "923001234567@c.us",
			"body": "RESET"
		}
	}`
	var payload wahaWebhookPayload
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatal(err)
	}
	from, text := extractWahaMessage(payload)
	if from != "" || text != "" {
		t.Fatalf("expected empty result for non-message event, got %q %q", from, text)
	}
}
