package service

import (
	"testing"
	"time"
)

func TestWeekendPromoActive_FriSunOnlyUntilAug31(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Karachi")
	if err != nil {
		loc = time.FixedZone("PKT", 5*3600)
	}
	at := func(y int, m time.Month, d, hh int) time.Time {
		return time.Date(y, m, d, hh, 0, 0, 0, loc)
	}

	if !WeekendPromoActive(at(2026, time.August, 7, 12)) { // Fri
		t.Fatal("Friday Aug 7 should be active")
	}
	if WeekendPromoActive(at(2026, time.August, 8, 12)) { // Sat
		t.Fatal("Saturday should not be active")
	}
	if !WeekendPromoActive(at(2026, time.August, 9, 12)) { // Sun
		t.Fatal("Sunday Aug 9 should be active")
	}
	if !WeekendPromoActive(at(2026, time.August, 30, 20)) { // Sun last weekend of Aug
		t.Fatal("Sunday Aug 30 should still be active")
	}
	if WeekendPromoActive(at(2026, time.September, 4, 12)) { // Fri after end
		t.Fatal("Friday after 31 Aug should be inactive")
	}
	if WeekendPromoActive(at(2026, time.August, 3, 12)) { // Mon
		t.Fatal("Monday should not be active")
	}
}

func TestWeekendDiscount_Amounts(t *testing.T) {
	loc, _ := time.LoadLocation("Asia/Karachi")
	friday := time.Date(2026, time.August, 7, 18, 0, 0, 0, loc)
	saturday := time.Date(2026, time.August, 8, 18, 0, 0, 0, loc)

	if got := WeekendDiscount(friday, 1200); got != 120 {
		t.Fatalf("Fri 1200 → want 120 got %d", got)
	}
	if got := WeekendDiscount(friday, 999); got != 0 {
		t.Fatalf("below min → want 0 got %d", got)
	}
	if got := WeekendDiscount(saturday, 5000); got != 0 {
		t.Fatalf("Sat → want 0 got %d", got)
	}
}
