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
	"time"

	"github.com/google/uuid"
)

const graphAPIBase = "https://graph.facebook.com/v21.0"

type textMessagePayload struct {
	MessagingProduct string `json:"messaging_product"`
	To               string `json:"to"`
	Type             string `json:"type"`
	Text             struct {
		Body string `json:"body"`
	} `json:"text"`
}

// NotifyNewOrderAsync sends a WhatsApp Cloud API text to the owner phone.
// Safe to call after a successful commit: runs in a goroutine, never returns
// an error to the caller, and no-ops when env is not configured.
func NotifyNewOrderAsync(orderID uuid.UUID, grandTotal int) {
	go notifyNewOrder(orderID, grandTotal)
}

func notifyNewOrder(orderID uuid.UUID, grandTotal int) {
	token := strings.TrimSpace(os.Getenv("WHATSAPP_TOKEN"))
	phoneNumberID := strings.TrimSpace(os.Getenv("WHATSAPP_PHONE_NUMBER_ID"))
	ownerPhone := strings.TrimSpace(os.Getenv("WHATSAPP_OWNER_PHONE"))
	if token == "" || phoneNumberID == "" || ownerPhone == "" {
		return
	}

	body := fmt.Sprintf("New order #%s - Rs.%d", orderID.String(), grandTotal)
	payload := textMessagePayload{
		MessagingProduct: "whatsapp",
		To:               ownerPhone,
		Type:             "text",
	}
	payload.Text.Body = body

	raw, err := json.Marshal(payload)
	if err != nil {
		log.Printf("whatsapp notify: marshal: %v", err)
		return
	}

	url := graphAPIBase + "/" + phoneNumberID + "/messages"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		log.Printf("whatsapp notify: new request: %v", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("whatsapp notify: send failed for order %s: %v", orderID, err)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf(
			"whatsapp notify: graph API %d for order %s: %s",
			resp.StatusCode,
			orderID,
			strings.TrimSpace(string(respBody)),
		)
	}
}
