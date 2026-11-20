package service

import (
	"fmt"

	"backend/internal/domain"

	"github.com/google/uuid"
)

type namalSite string

const (
	namalSiteNone   namalSite = ""
	namalSiteCampus namalSite = "campus"
	namalSiteHostel namalSite = "hostel"
)

// NamalDeliveryResult is the outcome of applying the Namal amount-based
// delivery rules to a cart subtotal.
type NamalDeliveryResult struct {
	Site         namalSite
	FreeDelivery bool
	Blocked      bool
	Message      string
}

func namalSiteForLocation(cfg domain.NamalDeliveryConfig, locationID uuid.UUID) namalSite {
	id := locationID.String()
	if id == cfg.CampusLocationID {
		return namalSiteCampus
	}
	if id == cfg.HostelLocationID {
		return namalSiteHostel
	}
	return namalSiteNone
}

// EvaluateNamalDelivery applies the Namal University / Namal Hostel delivery
// rules to a cart subtotal (Rs):
//   - Campus: free delivery at or above CampusFreeThreshold, normal fee below it.
//   - Hostel: orders below HostelMinOrder are blocked outright; free delivery
//     at or above HostelFreeThreshold; normal fee in between.
func EvaluateNamalDelivery(cfg domain.NamalDeliveryConfig, locationID uuid.UUID, subtotal int) NamalDeliveryResult {
	site := namalSiteForLocation(cfg, locationID)
	if !cfg.Enabled || site == namalSiteNone {
		return NamalDeliveryResult{Site: site}
	}

	switch site {
	case namalSiteCampus:
		if subtotal >= cfg.CampusFreeThreshold {
			return NamalDeliveryResult{Site: site, FreeDelivery: true}
		}
		return NamalDeliveryResult{Site: site}

	case namalSiteHostel:
		if subtotal < cfg.HostelMinOrder {
			return NamalDeliveryResult{
				Site:    site,
				Blocked: true,
				Message: fmt.Sprintf(
					"Minimum order for Namal Hostel is Rs. %d. Please add Rs. %d more to place this order.",
					cfg.HostelMinOrder, cfg.HostelMinOrder-subtotal,
				),
			}
		}
		if subtotal >= cfg.HostelFreeThreshold {
			return NamalDeliveryResult{Site: site, FreeDelivery: true}
		}
		return NamalDeliveryResult{Site: site}
	}

	return NamalDeliveryResult{Site: site}
}
