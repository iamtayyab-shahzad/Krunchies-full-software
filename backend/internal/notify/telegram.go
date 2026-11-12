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
)

const telegramAPIBase = "https://api.telegram.org"

// telegramMessage is the Telegram Bot API sendMessage payload.
type telegramMessage struct {
	ChatID string `json:"chat_id"`
	Text   string `json:"text"`
}

// NotifyTelegramAsync sends an order alert to a Telegram chat (bot token + chat id).
// Telegram is a separate company from Meta, so a WhatsApp ban/suspension does not
// affect it — it is the independent backup channel for order alerts.
func NotifyTelegramAsync(order OrderAlert, body string) {
	go notifyTelegram(order, body)
}

func notifyTelegram(order OrderAlert, body string) {
	token := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
	chatID := strings.TrimSpace(os.Getenv("TELEGRAM_CHAT_ID"))
	if token == "" || chatID == "" {
		log.Printf("telegram notify: skipped — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")
		return
	}

	url := fmt.Sprintf("%s/bot%s/sendMessage", telegramAPIBase, token)
	payload := telegramMessage{ChatID: chatID, Text: body}
	raw, err := json.Marshal(payload)
	if err != nil {
		log.Printf("telegram notify: marshal failed for order %s: %v", order.OrderID, err)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		log.Printf("telegram notify: request build failed for order %s: %v", order.OrderID, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("telegram notify: send failed for order %s: %v", order.OrderID, err)
		return
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))

	var tgResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	_ = json.Unmarshal(respBody, &tgResp)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 || !tgResp.OK {
		log.Printf("telegram notify: send failed for order %s: status %d body %s", order.OrderID, resp.StatusCode, strings.TrimSpace(string(respBody)))
		return
	}
	log.Printf("telegram notify: sent for order %s", order.OrderID)
}