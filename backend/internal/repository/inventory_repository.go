package repository

import (
	"backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

func (r *InventoryRepository) GetRecipeByProductID(productID uuid.UUID) ([]domain.Recipe, error) {
	var recipes []domain.Recipe
	if err := r.db.Where("product_id = ?", productID).Find(&recipes).Error; err != nil {
		return nil, err
	}
	return recipes, nil
}

func (r *InventoryRepository) DecreaseStock(tx *gorm.DB, inventoryID uuid.UUID, amount int) error {
	return tx.Model(&domain.Inventory{}).
		Where("id = ?", inventoryID).
		Update("stock", gorm.Expr("stock - ?", amount)).Error
}

func (r *InventoryRepository) AddTransaction(tx *gorm.DB, t *domain.InventoryTransaction) error {
	return tx.Create(t).Error
}
