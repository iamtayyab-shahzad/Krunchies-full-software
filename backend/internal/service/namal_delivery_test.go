package service

import (
	"testing"

	"backend/internal/domain"

	"github.com/google/uuid"
)

func TestEvaluateNamalDelivery_CampusBelowThreshold(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	campusID := uuid.MustParse(domain.NamalCampusLocationID)

	got := EvaluateNamalDelivery(cfg, campusID, 1500)
	if got.FreeDelivery || got.Blocked {
		t.Fatalf("expected normal paid delivery below threshold, got %#v", got)
	}
}

func TestEvaluateNamalDelivery_CampusAtThreshold(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	campusID := uuid.MustParse(domain.NamalCampusLocationID)

	got := EvaluateNamalDelivery(cfg, campusID, 2000)
	if !got.FreeDelivery {
		t.Fatalf("expected free delivery at campus threshold, got %#v", got)
	}
}

func TestEvaluateNamalDelivery_HostelBelowMinimum(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	hostelID := uuid.MustParse(domain.NamalHostelLocationID)

	got := EvaluateNamalDelivery(cfg, hostelID, 1000)
	if !got.Blocked || got.Message == "" {
		t.Fatalf("expected order blocked below hostel minimum, got %#v", got)
	}
}

func TestEvaluateNamalDelivery_HostelBetweenMinimumAndThreshold(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	hostelID := uuid.MustParse(domain.NamalHostelLocationID)

	got := EvaluateNamalDelivery(cfg, hostelID, 3000)
	if got.Blocked || got.FreeDelivery {
		t.Fatalf("expected normal paid delivery between minimum and threshold, got %#v", got)
	}
}

func TestEvaluateNamalDelivery_HostelFreeAtThreshold(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	hostelID := uuid.MustParse(domain.NamalHostelLocationID)

	got := EvaluateNamalDelivery(cfg, hostelID, 5000)
	if !got.FreeDelivery {
		t.Fatalf("expected free delivery at hostel threshold, got %#v", got)
	}
}

func TestEvaluateNamalDelivery_Disabled(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	campusID := uuid.MustParse(domain.NamalCampusLocationID)

	got := EvaluateNamalDelivery(cfg, campusID, 5000)
	if got.FreeDelivery || got.Blocked {
		t.Fatal("disabled config should not change delivery charge or block orders")
	}
}

func TestEvaluateNamalDelivery_UnrelatedLocation(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true

	got := EvaluateNamalDelivery(cfg, uuid.New(), 100)
	if got.FreeDelivery || got.Blocked || got.Site != namalSiteNone {
		t.Fatalf("expected no-op for unrelated location, got %#v", got)
	}
}
