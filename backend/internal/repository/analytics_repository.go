package repository

import (
	"time"

	"backend/internal/domain"

	"gorm.io/gorm"
)

type AnalyticsRepository struct {
	db *gorm.DB
}

func NewAnalyticsRepository(db *gorm.DB) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

func (r *AnalyticsRepository) SalesBetween(start, end time.Time) (int, error) {
	var total int
	err := r.db.Model(&domain.Order{}).
		Where("order_status = ? AND created_at >= ? AND created_at < ?", "COMPLETED", start, end).
		Select("COALESCE(SUM(grand_total), 0)").
		Scan(&total).Error
	return total, err
}

func (r *AnalyticsRepository) CancelledOrdersCount() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Order{}).Where("order_status = ?", "CANCELLED").Count(&count).Error
	return count, err
}

func (r *AnalyticsRepository) PaymentBreakdown() ([]map[string]any, error) {
	rows, err := r.db.Model(&domain.Payment{}).
		Select("method, COALESCE(SUM(amount), 0) as total").
		Group("method").Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]map[string]any, 0)
	for rows.Next() {
		var method string
		var total int
		if err := rows.Scan(&method, &total); err != nil {
			return nil, err
		}
		result = append(result, map[string]any{"method": method, "total": total})
	}
	return result, nil
}

func (r *AnalyticsRepository) BestSellingProducts(limit int) ([]map[string]any, error) {
	rows, err := r.db.Table("order_items").
		Select("product_id, COALESCE(SUM(quantity), 0) as qty").
		Group("product_id").
		Order("qty desc").
		Limit(limit).
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]map[string]any, 0)
	for rows.Next() {
		var productID string
		var qty int
		if err := rows.Scan(&productID, &qty); err != nil {
			return nil, err
		}
		result = append(result, map[string]any{"product_id": productID, "quantity": qty})
	}
	return result, nil
}

func (r *AnalyticsRepository) RemainingInventory() ([]domain.Inventory, error) {
	var inv []domain.Inventory
	if err := r.db.Order("stock asc").Find(&inv).Error; err != nil {
		return nil, err
	}
	return inv, nil
}
