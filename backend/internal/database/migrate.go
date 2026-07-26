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
		&domain.Supplier{},
		&domain.Inventory{},
		&domain.Recipe{},
		&domain.InventoryTransaction{},
		&domain.Purchase{},
		&domain.PurchaseItem{},
		&domain.Expense{},
		&domain.Setting{},
		&domain.Payment{},
	); err != nil {
		return err
	}

	// Backfill stable public order numbers for orders created before this field
	// existed, then enforce the invariant at the database layer.
	if err := db.Transaction(func(tx *gorm.DB) error {
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
	}); err != nil {
		return err
	}

	return backfillInventory(db)
}

// backfillInventory upgrades inventory rows that predate the unit-conversion
// and costing fields. Items created before this migration stored a free-text
// unit with no purchase unit, so we infer the unit kind from that text and
// treat the old purchase price as the cost of one base unit.
func backfillInventory(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Infer the unit kind from the legacy free-text unit.
		if err := tx.Exec(`
			UPDATE inventories
			SET unit_kind = CASE
				WHEN LOWER(unit) IN ('ml','l','litre','liter','ltr') THEN 'VOLUME'
				WHEN LOWER(unit) IN ('pcs','piece','pieces','unit','bottle','can','packet','pack','box') THEN 'COUNT'
				ELSE 'WEIGHT'
			END
			WHERE unit_kind IS NULL OR unit_kind = ''
		`).Error; err != nil {
			return err
		}

		// Default the purchasing side to "buy in the same unit we count in",
		// which is always correct until the owner edits the item.
		if err := tx.Exec(`
			UPDATE inventories
			SET purchase_unit = unit
			WHERE purchase_unit IS NULL OR purchase_unit = ''
		`).Error; err != nil {
			return err
		}
		if err := tx.Exec(`
			UPDATE inventories
			SET units_per_purchase = 1
			WHERE units_per_purchase IS NULL OR units_per_purchase <= 0
		`).Error; err != nil {
			return err
		}

		// Seed the weighted-average cost from the legacy purchase price.
		if err := tx.Exec(`
			UPDATE inventories
			SET avg_cost_micros = purchase_price::bigint * 1000000 / GREATEST(units_per_purchase, 1)
			WHERE avg_cost_micros = 0 AND purchase_price > 0
		`).Error; err != nil {
			return err
		}

		return tx.Exec(`
			UPDATE inventories SET is_active = TRUE WHERE is_active IS NULL
		`).Error
	})
}
