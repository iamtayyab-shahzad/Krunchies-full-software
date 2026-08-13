package service

import (
	"strings"
	"time"

	"backend/internal/domain"

	"github.com/google/uuid"
)

// Weekend promo constants kept for tests / seed defaults.
const (
	weekendPromoPercent   = 10
	weekendPromoMinRupees = 1000
	weekendPromoEndYMD    = "2026-08-31"
)

var (
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

// WeekendPromoActive is retained for older tests; prefer DiscountFromRules.
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
	// Known seeded Deals category id (legacy menu).
	if p.CategoryID == dealsCategoryID {
		return true
	}
	// Any category whose name contains "deal" (covers renamed/new Deals categories).
	cat := strings.ToLower(strings.TrimSpace(p.Category.Name))
	if strings.Contains(cat, "deal") {
		return true
	}
	name := strings.ToLower(p.Name)
	return strings.Contains(name, "deal") || strings.Contains(name, "mega combo")
}

// WeekendDiscount legacy helper — order path uses DiscountFromRules.
func WeekendDiscount(now time.Time, eligibleSubtotal int) int {
	if !WeekendPromoActive(now) || eligibleSubtotal < weekendPromoMinRupees {
		return 0
	}
	return (eligibleSubtotal * weekendPromoPercent) / 100
}
