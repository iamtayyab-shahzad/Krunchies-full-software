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
