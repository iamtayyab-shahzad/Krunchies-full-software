package service

import (
	"strings"
	"testing"
	"time"

	"backend/internal/domain"

	"github.com/google/uuid"
)

func TestEvaluateNamalFreeSlot_CampusMonThu(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	campusID := uuid.MustParse(domain.NamalCampusLocationID)

	now := time.Date(2026, 9, 7, 10, 0, 0, 0, karachiLoc) // Monday
	got := EvaluateNamalFreeSlot(cfg, campusID, now)
	if !got.Eligible {
		t.Fatalf("expected eligible, got %#v", got)
	}
	if !strings.Contains(got.SlotLabel, "Campus") {
		t.Fatalf("slot label: %s", got.SlotLabel)
	}
}

func TestEvaluateNamalFreeSlot_CampusTooLate(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	campusID := uuid.MustParse(domain.NamalCampusLocationID)
	now := time.Date(2026, 9, 7, 13, 0, 0, 0, karachiLoc)
	got := EvaluateNamalFreeSlot(cfg, campusID, now)
	if got.Eligible {
		t.Fatalf("expected not eligible after cutoff")
	}
}

func TestEvaluateNamalFreeSlot_HostelEvening(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	cfg.Enabled = true
	hostelID := uuid.MustParse(domain.NamalHostelLocationID)
	now := time.Date(2026, 9, 7, 18, 0, 0, 0, karachiLoc)
	got := EvaluateNamalFreeSlot(cfg, hostelID, now)
	if !got.Eligible {
		t.Fatalf("expected hostel eligible, got %#v", got)
	}
}

func TestEvaluateNamalFreeSlot_Disabled(t *testing.T) {
	cfg := domain.DefaultNamalDeliveryConfig()
	campusID := uuid.MustParse(domain.NamalCampusLocationID)
	now := time.Date(2026, 9, 7, 10, 0, 0, 0, karachiLoc)
	got := EvaluateNamalFreeSlot(cfg, campusID, now)
	if got.Eligible {
		t.Fatal("disabled should not be eligible")
	}
}
