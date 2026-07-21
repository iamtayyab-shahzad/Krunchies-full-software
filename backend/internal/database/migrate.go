package database

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&domain.User{},
		&domain.Customer{},
		&domain.Category{},
		&domain.Product{},
		&domain.ProductSize{},
		&domain.Location{},
		&domain.Offer{},
		&domain.Order{},
		&domain.OrderItem{},
		&domain.Inventory{},
		&domain.Recipe{},
		&domain.InventoryTransaction{},
		&domain.Setting{},
		&domain.Payment{},
	); err != nil {
		return err
	}

	// Backfill stable public order numbers for orders created before this field
	// existed, then enforce the invariant at the database layer.
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`
			UPDATE orders
			SET order_number = 'KR-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 16))
			WHERE order_number IS NULL OR order_number = ''
		`).Error; err != nil {
			return err
		}
		if err := tx.Exec(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number
			ON orders (order_number)
		`).Error; err != nil {
			return err
		}
		return tx.Exec(`
			ALTER TABLE orders
			ALTER COLUMN order_number SET NOT NULL
		`).Error
	})
}
