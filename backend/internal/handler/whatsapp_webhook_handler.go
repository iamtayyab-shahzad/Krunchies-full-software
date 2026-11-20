package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

type WhatsAppWebhookHandler struct {
	auth *service.AuthService
}

func NewWhatsAppWebhookHandler(auth *service.AuthService) *WhatsAppWebhookHandler {
	return &WhatsAppWebhookHandler{auth: auth}
}

// wahaWebhookPayload is the event WAHA (https://waha.devlike.pro) posts to our
// webhook URL for every WhatsApp event on the configured session. Point the
// session's Webhook URL at POST /webhook/whatsapp, subscribed to "message".
type wahaWebhookPayload struct {
	Event   string `json:"event"`
	Payload struct {
		From   string `json:"from"`
		FromMe bool   `json:"fromMe"`
		Body   string `json:"body"`
	} `json:"payload"`
}

// Receive handles incoming WhatsApp messages posted by WAHA (POST).
// Always responds 200 so WAHA does not retry.
func (h *WhatsAppWebhookHandler) Receive(c *gin.Context) {
	body, err := c.GetRawData()
	if err != nil {
		log.Printf("whatsapp webhook: read body error: %v", err)
		c.Status(http.StatusOK)
		return
	}

	var payload wahaWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("whatsapp webhook: json unmarshal error: %v", err)
		c.Status(http.StatusOK)
		return
	}

	from, text := extractWahaMessage(payload)
	if from == "" || text == "" {
		c.Status(http.StatusOK)
		return
	}

	normalized := strings.ToLower(strings.TrimSpace(text))
	if normalized != "reset" {
		log.Printf("whatsapp webhook: ignoring non-reset message from %s: %q", from, normalized)
		c.Status(http.StatusOK)
		return
	}

	log.Printf("whatsapp webhook: RESET from %s, processing async", from)
	go func(phone string) {
		if err := h.auth.HandleWhatsAppPasswordReset(phone); err != nil {
			log.Printf("whatsapp webhook: password reset failed for %s: %v", phone, err)
		} else {
			log.Printf("whatsapp webhook: password reset completed for %s", phone)
		}
	}(from)

	c.Status(http.StatusOK)
}

// extractWahaMessage pulls the sender phone and text body out of a WAHA webhook
// event, ignoring anything that isn't an inbound text message (e.g. our own
// outgoing alerts, which WAHA also reports on the same webhook with fromMe=true).
func extractWahaMessage(payload wahaWebhookPayload) (from, text string) {
	if payload.Event != "message" || payload.Payload.FromMe {
		return "", ""
	}
	from = strings.TrimSuffix(payload.Payload.From, "@c.us")
	from = strings.TrimSuffix(from, "@s.whatsapp.net")
	return strings.TrimSpace(from), strings.TrimSpace(payload.Payload.Body)
}
