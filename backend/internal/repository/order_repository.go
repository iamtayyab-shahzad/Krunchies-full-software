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
	var order domain.Order
	if err := r.db.Preload("Items").Preload("Payment").First(&order, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) List() ([]domain.Order, error) {
	var orders []domain.Order
	if err := r.db.Preload("Items").Order("created_at desc").Find(&orders).Error; err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *OrderRepository) UpdateStatus(tx *gorm.DB, id uuid.UUID, status string) error {
	return tx.Model(&domain.Order{}).Where("id = ?", id).Update("order_status", status).Error
}

func (r *OrderRepository) Update(tx *gorm.DB, id uuid.UUID, updates map[string]any) error {
	return tx.Model(&domain.Order{}).Where("id = ?", id).Updates(updates).Error
}
