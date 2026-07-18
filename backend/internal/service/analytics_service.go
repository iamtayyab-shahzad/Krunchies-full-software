package service

import (
	"time"

	"backend/internal/repository"

	"gorm.io/gorm"
)

type AnalyticsService struct {
	repo *repository.AnalyticsRepository
}

func NewAnalyticsService(db *gorm.DB) *AnalyticsService {
	return &AnalyticsService{repo: repository.NewAnalyticsRepository(db)}
}

func (s *AnalyticsService) TodaySales() (int, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := start.Add(24 * time.Hour)
	return s.repo.SalesBetween(start, end)
}

func (s *AnalyticsService) YesterdaySales() (int, error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Add(-24 * time.Hour)
	end := start.Add(24 * time.Hour)
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
