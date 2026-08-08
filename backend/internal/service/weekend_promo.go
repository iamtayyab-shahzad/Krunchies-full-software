package service

import (
	"strings"
	"time"

	"backend/internal/domain"

	"github.com/google/uuid"
)

// Weekend promo: Fri & Sun 10% on non-deal lines when eligible subtotal ≥ Rs 1000.
// Valid through 31 Aug 2026 (Asia/Karachi). Saturday is excluded. Flyer deals
// already include savings and must never stack this discount.
const (
	weekendPromoPercent   = 10
	weekendPromoMinRupees = 1000
	// Inclusive last calendar day in Asia/Karachi.
	weekendPromoEndYMD = "2026-08-31"
)

var (
	// Deterministic deals category id from shared/krunchies-menu.json.
	dealsCategoryID = uuid.MustParse("10000000-0000-4000-8000-000000000012")
	karachiLoc      *time.Location
)

func init() {
	loc, err := time.LoadLocation("Asia/Karachi")
	if err != nil {
		loc = time.FixedZone("PKT", 5*3600)
	}
	karachiLoc = loc
}

// WeekendPromoActive is true Fri/Sun in Asia/Karachi through 31 Aug 2026.
func WeekendPromoActive(now time.Time) bool {
	t := now.In(karachiLoc)
	if t.Format("2006-01-02") > weekendPromoEndYMD {
		return false
	}
	switch t.Weekday() {
	case time.Friday, time.Sunday:
		return true
	default:
		return false
	}
}

func isDealProduct(p domain.Product) bool {
	if p.CategoryID == dealsCategoryID {
		return true
	}
	name := strings.ToLower(p.Name)
	return strings.Contains(name, "deal") || strings.Contains(name, "mega combo")
}

// WeekendDiscount returns whole-rupee discount for eligible non-deal line totals.
func WeekendDiscount(now time.Time, eligibleSubtotal int) int {
	if !WeekendPromoActive(now) || eligibleSubtotal < weekendPromoMinRupees {
		return 0
	}
	return (eligibleSubtotal * weekendPromoPercent) / 100
}
