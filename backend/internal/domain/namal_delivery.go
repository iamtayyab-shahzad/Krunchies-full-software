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

// NamalDeliveryConfig controls the amount-based delivery rules for Namal
// University campus and Namal Hostel. All amounts are in Rs (whole rupees).
type NamalDeliveryConfig struct {
	Enabled bool `json:"enabled"`

	CampusLocationID string `json:"campus_location_id"`
	HostelLocationID string `json:"hostel_location_id"`

	// Campus: orders at or above this subtotal get free delivery. Below it,
	// the location's normal delivery charge applies. No minimum order.
	CampusFreeThreshold int `json:"campus_free_threshold"`

	// Hostel: orders below HostelMinOrder are rejected outright. At or above
	// HostelFreeThreshold delivery is free; in between, the normal charge applies.
	HostelMinOrder      int `json:"hostel_min_order"`
	HostelFreeThreshold int `json:"hostel_free_threshold"`
}

func DefaultNamalDeliveryConfig() NamalDeliveryConfig {
	return NamalDeliveryConfig{
		Enabled:             false,
		CampusLocationID:    NamalCampusLocationID,
		HostelLocationID:    NamalHostelLocationID,
		CampusFreeThreshold: 2000,
		HostelMinOrder:      1500,
		HostelFreeThreshold: 5000,
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
