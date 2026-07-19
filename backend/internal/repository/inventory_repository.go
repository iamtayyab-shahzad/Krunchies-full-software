package repository

import (
	"net/http"

	"backend/internal/domain"
	"backend/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type InventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

func (r *InventoryRepository) GetRecipeByProductID(tx *gorm.DB, productID uuid.UUID) ([]domain.Recipe, error) {
	var recipes []domain.Recipe
	if err := tx.Where("product_id = ?", productID).Find(&recipes).Error; err != nil {
		return nil, err
	}
	return recipes, nil
}

// DecreaseStock atomically reduces stock only when enough quantity is available.
func (r *InventoryRepository) DecreaseStock(tx *gorm.DB, inventoryID uuid.UUID, amount int) error {
	res := tx.Model(&domain.Inventory{}).
		Where("id = ? AND stock >= ?", inventoryID, amount).
		Update("stock", gorm.Expr("stock - ?", amount))
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return utils.NewAppError(http.StatusConflict, "insufficient inventory stock")
	}
	return nil
}

func (r *InventoryRepository) LockInventory(tx *gorm.DB, inventoryID uuid.UUID) (*domain.Inventory, error) {
	var item domain.Inventory
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&item, "id = ?", inventoryID).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *InventoryRepository) AddTransaction(tx *gorm.DB, t *domain.InventoryTransaction) error {
	return tx.Create(t).Error
}

func (r *InventoryRepository) LowStock() ([]domain.Inventory, error) {
	var inv []domain.Inventory
	if err := r.db.
		Where("stock <= minimum_stock").
		Order("stock asc").
		Find(&inv).Error; err != nil {
		return nil, err
	}
	return inv, nil
}

func (r *InventoryRepository) ListTransactions(inventoryID *uuid.UUID) ([]domain.InventoryTransaction, error) {
	var rows []domain.InventoryTransaction
	q := r.db.Preload("Inventory").Order("created_at desc")
	if inventoryID != nil {
		q = q.Where("inventory_id = ?", *inventoryID)
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
