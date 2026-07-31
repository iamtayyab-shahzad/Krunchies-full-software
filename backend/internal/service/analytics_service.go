package service

import (
	"time"

	"backend/internal/domain"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type AnalyticsService struct {
	repo *repository.AnalyticsRepository
}

func NewAnalyticsService(db *gorm.DB) *AnalyticsService {
	return &AnalyticsService{repo: repository.NewAnalyticsRepository(db)}
}

// businessDayRange returns [start, end) for the calendar day in Asia/Karachi
// (midnight 12:00 AM → next midnight), not restaurant opening hours.
func businessDayRange(now time.Time) (time.Time, time.Time) {
	loc := karachiLoc
	if loc == nil {
		loc = time.FixedZone("PKT", 5*3600)
	}
	local := now.In(loc)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)
	return start, start.Add(24 * time.Hour)
}

func (s *AnalyticsService) TodaySales() (int, error) {
	start, end := businessDayRange(time.Now())
	return s.repo.SalesBetween(start, end)
}

func (s *AnalyticsService) YesterdaySales() (int, error) {
	start, end := businessDayRange(time.Now())
	start = start.Add(-24 * time.Hour)
	end = end.Add(-24 * time.Hour)
	return s.repo.SalesBetween(start, end)
}

func (s *AnalyticsService) WeeklySales() (int, error) {
	now := time.Now()
	start := now.AddDate(0, 0, -7)
	return s.repo.SalesBetween(start, now)
}

func (s *AnalyticsService) MonthlySales() (int, error) {
	now := time.Now()
	start := now.AddDate(0, -1, 0)
	return s.repo.SalesBetween(start, now)
}

func (s *AnalyticsService) CancelledOrders() (int64, error) {
	return s.repo.CancelledOrdersCount()
}

func (s *AnalyticsService) PaymentBreakdown() ([]map[string]any, error) {
	return s.repo.PaymentBreakdown()
}

func (s *AnalyticsService) BestSellingProducts() ([]map[string]any, error) {
	return s.repo.BestSellingProducts(10)
}

func (s *AnalyticsService) RemainingInventory() (any, error) {
	return s.repo.RemainingInventory()
}

func (s *AnalyticsService) LowStockItems() ([]domain.Inventory, error) {
	return s.repo.LowStockInventory()
}
