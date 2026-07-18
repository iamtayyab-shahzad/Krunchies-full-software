package domain

import "github.com/google/uuid"

type Recipe struct {
	BaseModel
	ProductID        uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	Product          Product   `gorm:"foreignKey:ProductID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"product,omitempty"`
	InventoryID      uuid.UUID `gorm:"type:uuid;not null;index" json:"inventory_id"`
	Inventory        Inventory `gorm:"foreignKey:InventoryID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"inventory,omitempty"`
	QuantityRequired int       `gorm:"not null" json:"quantity_required"`
}
