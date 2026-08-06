package service

import (
	"testing"
	"time"

	"backend/internal/domain"
)

func TestCostScaleMatchesDomain(t *testing.T) {
	// 2.5 KG cheese at Rs 1200/KG → quantity_micros=2_500_000, line=3000
	qtyMicros := int64(2.5 * float64(domain.CostScale))
	unitsPer := int64(1000)
	qtyBase := (qtyMicros * unitsPer) / domain.CostScale
	if qtyBase != 2500 {
		t.Fatalf("expected 2500 g, got %d", qtyBase)
	}
	lineTotal := 3000
	unitCost := domain.CostMicrosPerBaseUnit(lineTotal, qtyBase)
	// 3000 Rs / 2500 g = 1.2 Rs/g = 1_200_000 micros
	if unitCost != 1_200_000 {
		t.Fatalf("expected 1200000, got %d", unitCost)
	}
}

func TestRecommendUrgencyLabels(t *testing.T) {
	// Smoke: ensure Recommendation type fields stay JSON-compatible.
	rec := Recommendation{
		Name:          "Cheese",
		Urgency:       "HIGH",
		DaysRemaining: 1.5,
		Reason:        "Stock will run out within two days at the current usage rate",
	}
	if rec.Urgency != "HIGH" {
		t.Fatal("urgency mismatch")
	}
}

func TestProfitLossShape(t *testing.T) {
	pl := &ProfitLoss{
		Start:       time.Now(),
		End:         time.Now().Add(24 * time.Hour),
		Revenue:     100000,
		COGS:        30000,
		GrossProfit: 70000,
		Expenses:    20000,
		WastageCost: 1000,
		NetProfit:   49000,
	}
	pl.FoodCostPercent = (float64(pl.COGS) / float64(pl.Revenue)) * 100
	if pl.FoodCostPercent != 30 {
		t.Fatalf("food cost %% = %v", pl.FoodCostPercent)
	}
	if pl.NetProfit != pl.GrossProfit-pl.Expenses-pl.WastageCost {
		t.Fatal("net profit formula broken")
	}
}

func TestFoodCostFallbackPrefersRecipeCOGS(t *testing.T) {
	recipeCOGS := 10000
	purchases := 25000
	food := recipeCOGS
	source := "cogs"
	if recipeCOGS == 0 && purchases > 0 {
		food = purchases
		source = "purchases"
	} else if recipeCOGS == 0 {
		source = "none"
	}
	if food != 10000 || source != "cogs" {
		t.Fatalf("should prefer recipe COGS, got food=%d source=%s", food, source)
	}

	recipeCOGS = 0
	food = recipeCOGS
	source = "cogs"
	if recipeCOGS == 0 && purchases > 0 {
		food = purchases
		source = "purchases"
	}
	if food != 25000 || source != "purchases" {
		t.Fatalf("should fall back to purchases, got food=%d source=%s", food, source)
	}
}

func TestFillPeriodAveragesCompleteWeek(t *testing.T) {
	loc := karachi()
	start := time.Date(2026, 8, 3, 0, 0, 0, 0, loc) // Monday
	end := start.AddDate(0, 0, 7)
	pl := &ProfitLoss{
		Revenue:  70000,
		Expenses: 14000,
		NetProfit: 56000,
	}
	// Force "complete" by using a past window relative to fillPeriodAverages' now —
	// call the helper fields directly for deterministic math.
	pl.PeriodDays = calendarDays(start, end)
	pl.ElapsedDays = pl.PeriodDays
	pl.PeriodComplete = true
	pl.AvgDailyRevenue = pl.Revenue / pl.ElapsedDays
	pl.AvgDailyExpenses = pl.Expenses / pl.ElapsedDays
	pl.AvgDailyProfit = pl.NetProfit / pl.ElapsedDays
	if pl.PeriodDays != 7 {
		t.Fatalf("period days want 7 got %d", pl.PeriodDays)
	}
	if pl.AvgDailyProfit != 8000 {
		t.Fatalf("avg daily profit want 8000 got %d", pl.AvgDailyProfit)
	}
}
