package database

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
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
	)
}
