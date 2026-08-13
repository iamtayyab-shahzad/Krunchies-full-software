package service

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DiscountRuleService struct {
	crud *CRUDService[domain.DiscountRule]
	repo *repository.GenericRepository[domain.DiscountRule]
	db   *gorm.DB
}

func NewDiscountRuleService(db *gorm.DB) *DiscountRuleService {
	repo := repository.NewGenericRepository[domain.DiscountRule](db)
	return &DiscountRuleService{crud: NewCRUDService(repo), repo: repo, db: db}
}

func (s *DiscountRuleService) Create(model *domain.DiscountRule) error {
	if err := normalizeDiscountRule(model); err != nil {
		return err
	}
	return s.crud.Create(model)
}

func (s *DiscountRuleService) GetByID(id uuid.UUID) (*domain.DiscountRule, error) {
	return s.crud.GetByID(id)
}

func (s *DiscountRuleService) List() ([]domain.DiscountRule, error) {
	return s.crud.List()
}

func (s *DiscountRuleService) ListActive() ([]domain.DiscountRule, error) {
	var rows []domain.DiscountRule
	err := s.db.Where("active = ?", true).Order("created_at asc").Find(&rows).Error
	return rows, err
}

func (s *DiscountRuleService) Update(id uuid.UUID, updates map[string]any) error {
	if v, ok := updates["schedule_type"].(string); ok {
		updates["schedule_type"] = strings.TrimSpace(strings.ToLower(v))
	}
	if v, ok := updates["weekdays"].([]any); ok {
		nums := make([]int, 0, len(v))
		for _, x := range v {
			switch n := x.(type) {
			case float64:
				nums = append(nums, int(n))
			case int:
				nums = append(nums, n)
			}
		}
		b, _ := json.Marshal(nums)
		updates["weekdays_json"] = string(b)
		delete(updates, "weekdays")
	}
	if v, ok := updates["weekdays_json"].(string); ok && v == "" {
		updates["weekdays_json"] = "[]"
	}
	// Accept exclude_deals as bool (JSON) — default stay true when omitted.
	if raw, ok := updates["exclude_deals"]; ok {
		switch v := raw.(type) {
		case bool:
			updates["exclude_deals"] = v
		case string:
			updates["exclude_deals"] = strings.EqualFold(v, "true") || v == "1"
		}
	}
	for _, key := range []string{"start_date", "end_date"} {
		raw, ok := updates[key]
		if !ok {
			continue
		}
		if raw == nil {
			updates[key] = nil
			continue
		}
		if s, ok := raw.(string); ok {
			s = strings.TrimSpace(s)
			if s == "" {
				updates[key] = nil
				continue
			}
			t, err := time.Parse(time.RFC3339, s)
			if err != nil {
				ymd := s
				if len(s) > 10 {
					ymd = s[:10]
				}
				t, err = time.ParseInLocation("2006-01-02", ymd, karachiLoc)
			}
			if err != nil {
				return utils.NewAppError(http.StatusBadRequest, "invalid "+key)
			}
			// Always store calendar day in Karachi (avoids UTC day-shift in admin UI).
			day := karachiDateOnly(t)
			updates[key] = day
		}
	}
	return s.crud.Update(id, updates)
}

func (s *DiscountRuleService) Delete(id uuid.UUID) error { return s.crud.Delete(id) }

func (s *DiscountRuleService) Enable(id uuid.UUID) error {
	return s.crud.Update(id, map[string]any{"active": true})
}

func (s *DiscountRuleService) Disable(id uuid.UUID) error {
	return s.crud.Update(id, map[string]any{"active": false})
}

// SeedDefaultWeekendRule inserts the legacy Fri/Sun 10% rule once if table is empty.
func (s *DiscountRuleService) SeedDefaultWeekendRule() error {
	var count int64
	if err := s.db.Model(&domain.DiscountRule{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	end, err := time.ParseInLocation("2006-01-02", "2026-08-31", karachiLoc)
	if err != nil {
		return err
	}
	weekdays, _ := json.Marshal([]int{int(time.Friday), int(time.Sunday)})
	rule := &domain.DiscountRule{
		Name:         "Fri & Sun 10% off",
		Active:       true,
		Percent:      10,
		MinSubtotal:  1000,
		ScheduleType: ScheduleWeekdays,
		EndDate:      &end,
		WeekdaysJSON: string(weekdays),
		ExcludeDeals: true,
	}
	return s.db.Create(rule).Error
}

func normalizeDiscountRule(model *domain.DiscountRule) error {
	model.Name = strings.TrimSpace(model.Name)
	if model.Name == "" {
		return utils.NewAppError(http.StatusBadRequest, "name is required")
	}
	model.ScheduleType = strings.TrimSpace(strings.ToLower(model.ScheduleType))
	if model.ScheduleType == "" {
		model.ScheduleType = ScheduleAlways
	}
	switch model.ScheduleType {
	case ScheduleAlways, ScheduleDateRange, ScheduleWeekdays:
	default:
		return utils.NewAppError(http.StatusBadRequest, "invalid schedule_type")
	}
	if model.Percent < 1 || model.Percent > 100 {
		return utils.NewAppError(http.StatusBadRequest, "percent must be 1–100")
	}
	if model.MinSubtotal < 0 {
		return utils.NewAppError(http.StatusBadRequest, "min_subtotal cannot be negative")
	}
	if model.WeekdaysJSON == "" {
		model.WeekdaysJSON = "[]"
	}
	if model.StartDate != nil {
		d := karachiDateOnly(*model.StartDate)
		model.StartDate = &d
	}
	if model.EndDate != nil {
		d := karachiDateOnly(*model.EndDate)
		model.EndDate = &d
	}
	if model.ScheduleType == ScheduleDateRange && (model.StartDate == nil || model.EndDate == nil) {
		return utils.NewAppError(http.StatusBadRequest, "date_range requires start_date and end_date")
	}
	if model.ScheduleType == ScheduleWeekdays && len(parseWeekdaysJSON(model.WeekdaysJSON)) == 0 {
		return utils.NewAppError(http.StatusBadRequest, "weekdays schedule requires at least one weekday")
	}
	return nil
}
