package repository

import (
	"backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) Create(tx *gorm.DB, order *domain.Order) error {
	return tx.Create(order).Error
}

func (r *OrderRepository) GetByID(id uuid.UUID) (*domain.Order, error) {
	return r.GetByIDTx(r.db, id)
}

func (r *OrderRepository) GetByIDTx(tx *gorm.DB, id uuid.UUID) (*domain.Order, error) {
	var order domain.Order
	if err := tx.
		Preload("Items").
		Preload("Items.Product").
		Preload("Items.ProductSize").
		Preload("Location").
		Preload("Payment").
		First(&order, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) List() ([]domain.Order, error) {
	var orders []domain.Order
	if err := r.db.
		Preload("Items").
		Preload("Payment").
		Preload("Location").
		Order("created_at desc").
		Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *OrderRepository) ListByStatus(status string) ([]domain.Order, error) {
	var orders []domain.Order
	if err := r.db.
		Preload("Items").
		Preload("Payment").
		Preload("Location").
		Where("order_status = ?", status).
		Order("created_at desc").
		Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *OrderRepository) ListByType(orderType string) ([]domain.Order, error) {
	var orders []domain.Order
	if err := r.db.
		Preload("Items").
		Preload("Payment").
		Where("order_type = ?", orderType).
		Order("created_at desc").
		Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *OrderRepository) UpdateStatus(tx *gorm.DB, id uuid.UUID, status string) error {
	return tx.Model(&domain.Order{}).Where("id = ?", id).Update("order_status", status).Error
}

// TransitionStatus updates status only when current status is fromStatus (atomic).
func (r *OrderRepository) TransitionStatus(tx *gorm.DB, id uuid.UUID, fromStatus, toStatus string) (int64, error) {
	res := tx.Model(&domain.Order{}).
		Where("id = ? AND order_status = ?", id, fromStatus).
		Update("order_status", toStatus)
	return res.RowsAffected, res.Error
}

func (r *OrderRepository) Update(tx *gorm.DB, id uuid.UUID, updates map[string]any) error {
	return tx.Model(&domain.Order{}).Where("id = ?", id).Updates(updates).Error
}

func (r *OrderRepository) Delete(tx *gorm.DB, id uuid.UUID) error {
	return tx.Delete(&domain.Order{}, "id = ?", id).Error
}
