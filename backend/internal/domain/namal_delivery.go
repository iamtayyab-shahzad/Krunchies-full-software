package domain

import (
	"encoding/json"
	"strings"
)

// Default Namal location IDs (seeded in krunchies-menu.json).
const (
	NamalCampusLocationID = "50000000-0000-4000-8000-000000000004"
	NamalHostelLocationID = "50000000-0000-4000-8000-000000000005"
)

// NamalDeliveryConfig controls free scheduled delivery for Namal campus/hostel.
// Times are 24h "HH:MM" in Asia/Karachi.
type NamalDeliveryConfig struct {
	Enabled bool `json:"enabled"`

	CampusLocationID string `json:"campus_location_id"`
	HostelLocationID string `json:"hostel_location_id"`

	// Campus: order Mon–Fri 08:00–12:45; deliver Mon–Thu 13:30–14:00, Fri 14:00–14:30.
	CampusOrderStart           string `json:"campus_order_start"`
	CampusOrderEnd             string `json:"campus_order_end"`
	CampusDeliveryStartMonThu  string `json:"campus_delivery_start_mon_thu"`
	CampusDeliveryEndMonThu    string `json:"campus_delivery_end_mon_thu"`
	CampusDeliveryStartFri     string `json:"campus_delivery_start_fri"`
	CampusDeliveryEndFri       string `json:"campus_delivery_end_fri"`

	// Hostel: order any day 08:00–19:30; deliver 20:00–20:30.
	HostelOrderStart    string `json:"hostel_order_start"`
	HostelOrderEnd      string `json:"hostel_order_end"`
	HostelDeliveryStart string `json:"hostel_delivery_start"`
	HostelDeliveryEnd   string `json:"hostel_delivery_end"`
}

func DefaultNamalDeliveryConfig() NamalDeliveryConfig {
	return NamalDeliveryConfig{
		Enabled:                   false,
		CampusLocationID:          NamalCampusLocationID,
		HostelLocationID:          NamalHostelLocationID,
		CampusOrderStart:          "08:00",
		CampusOrderEnd:            "12:45",
		CampusDeliveryStartMonThu: "13:30",
		CampusDeliveryEndMonThu:   "14:00",
		CampusDeliveryStartFri:    "14:00",
		CampusDeliveryEndFri:      "14:30",
		HostelOrderStart:          "08:00",
		HostelOrderEnd:            "19:30",
		HostelDeliveryStart:       "20:00",
		HostelDeliveryEnd:         "20:30",
	}
}

func ParseNamalDeliveryConfig(raw string) NamalDeliveryConfig {
	cfg := DefaultNamalDeliveryConfig()
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return cfg
	}
	_ = json.Unmarshal([]byte(raw), &cfg)
	if strings.TrimSpace(cfg.CampusLocationID) == "" {
		cfg.CampusLocationID = NamalCampusLocationID
	}
	if strings.TrimSpace(cfg.HostelLocationID) == "" {
		cfg.HostelLocationID = NamalHostelLocationID
	}
	return cfg
}

func (c NamalDeliveryConfig) JSON() string {
	b, err := json.Marshal(c)
	if err != nil {
		return "{}"
	}
	return string(b)
}
