package service

import (
	"fmt"
	"strings"
	"time"

	"backend/internal/domain"

	"github.com/google/uuid"
)

type namalSite string

const (
	namalSiteNone   namalSite = ""
	namalSiteCampus namalSite = "campus"
	namalSiteHostel namalSite = "hostel"
)

type NamalSlotResult struct {
	Eligible      bool
	Site          namalSite
	SlotLabel     string
	KitchenNote   string
	OrderWindowOK bool
	Reason        string
}

func namalSiteForLocation(cfg domain.NamalDeliveryConfig, locationID uuid.UUID) namalSite {
	id := locationID.String()
	if id == strings.TrimSpace(cfg.CampusLocationID) {
		return namalSiteCampus
	}
	if id == strings.TrimSpace(cfg.HostelLocationID) {
		return namalSiteHostel
	}
	return namalSiteNone
}

func parseHHMM(s string) (int, bool) {
	s = strings.TrimSpace(s)
	var h, m int
	if _, err := fmt.Sscanf(s, "%d:%d", &h, &m); err != nil {
		return 0, false
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, false
	}
	return h*60 + m, true
}

func inMinuteWindow(nowMin, startMin, endMin int) bool {
	// Inclusive start, inclusive end for cutoffs like 12:45 (order until 12:45).
	return nowMin >= startMin && nowMin <= endMin
}

func formatSlotRange(start, end string) string {
	return fmt.Sprintf("%s–%s", displayHHMM(start), displayHHMM(end))
}

func displayHHMM(s string) string {
	mins, ok := parseHHMM(s)
	if !ok {
		return strings.TrimSpace(s)
	}
	h := mins / 60
	m := mins % 60
	ap := "AM"
	if h >= 12 {
		ap = "PM"
	}
	h12 := h % 12
	if h12 == 0 {
		h12 = 12
	}
	return fmt.Sprintf("%d:%02d %s", h12, m, ap)
}

// EvaluateNamalFreeSlot checks same-day free scheduled delivery for a Namal location.
func EvaluateNamalFreeSlot(cfg domain.NamalDeliveryConfig, locationID uuid.UUID, now time.Time) NamalSlotResult {
	if !cfg.Enabled {
		return NamalSlotResult{Reason: "Namal free delivery is turned off"}
	}
	site := namalSiteForLocation(cfg, locationID)
	if site == namalSiteNone {
		return NamalSlotResult{Reason: "location is not a Namal free-delivery area"}
	}

	loc := karachiLoc
	if loc == nil {
		loc = time.UTC
	}
	local := now.In(loc)
	weekday := local.Weekday() // Sunday=0 … Saturday=6
	nowMin := local.Hour()*60 + local.Minute()

	switch site {
	case namalSiteCampus:
		// Campus free slots Mon–Fri only (same day).
		if weekday < time.Monday || weekday > time.Friday {
			return NamalSlotResult{
				Site:   site,
				Reason: "campus free delivery runs Monday–Friday only",
			}
		}
		orderStart, ok1 := parseHHMM(cfg.CampusOrderStart)
		orderEnd, ok2 := parseHHMM(cfg.CampusOrderEnd)
		if !ok1 || !ok2 {
			return NamalSlotResult{Site: site, Reason: "invalid campus order window"}
		}
		if !inMinuteWindow(nowMin, orderStart, orderEnd) {
			return NamalSlotResult{
				Site:          site,
				OrderWindowOK: false,
				Reason: fmt.Sprintf(
					"order by %s for today's campus free delivery",
					displayHHMM(cfg.CampusOrderEnd),
				),
			}
		}
		var delStart, delEnd string
		if weekday == time.Friday {
			delStart = cfg.CampusDeliveryStartFri
			delEnd = cfg.CampusDeliveryEndFri
		} else {
			delStart = cfg.CampusDeliveryStartMonThu
			delEnd = cfg.CampusDeliveryEndMonThu
		}
		label := fmt.Sprintf("Namal Campus · %s", formatSlotRange(delStart, delEnd))
		return NamalSlotResult{
			Eligible:      true,
			Site:          site,
			SlotLabel:     label,
			OrderWindowOK: true,
			KitchenNote: fmt.Sprintf(
				"[NAMAL FREE SLOT] Deliver to campus today %s (Pakistan). Batch with other Namal campus orders.",
				formatSlotRange(delStart, delEnd),
			),
		}

	case namalSiteHostel:
		orderStart, ok1 := parseHHMM(cfg.HostelOrderStart)
		orderEnd, ok2 := parseHHMM(cfg.HostelOrderEnd)
		if !ok1 || !ok2 {
			return NamalSlotResult{Site: site, Reason: "invalid hostel order window"}
		}
		if !inMinuteWindow(nowMin, orderStart, orderEnd) {
			return NamalSlotResult{
				Site:          site,
				OrderWindowOK: false,
				Reason: fmt.Sprintf(
					"order by %s for tonight's hostel free delivery",
					displayHHMM(cfg.HostelOrderEnd),
				),
			}
		}
		label := fmt.Sprintf("Namal Hostel · %s", formatSlotRange(cfg.HostelDeliveryStart, cfg.HostelDeliveryEnd))
		return NamalSlotResult{
			Eligible:      true,
			Site:          site,
			SlotLabel:     label,
			OrderWindowOK: true,
			KitchenNote: fmt.Sprintf(
				"[NAMAL FREE SLOT] Deliver to hostel today %s (Pakistan). Batch with other Namal hostel orders.",
				formatSlotRange(cfg.HostelDeliveryStart, cfg.HostelDeliveryEnd),
			),
		}
	}

	return NamalSlotResult{Reason: "unknown Namal site"}
}
