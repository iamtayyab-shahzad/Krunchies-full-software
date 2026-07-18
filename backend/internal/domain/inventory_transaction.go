package domain

import "github.com/google/uuid"

type InventoryTransaction struct {
	BaseModel
	InventoryID     uuid.UUID `gorm:"type:uuid;not null;index" json:"inventory_id"`
	Inventory       Inventory `gorm:"foreignKey:InventoryID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"inventory,omitempty"`
	Quantity        int       `gorm:"not null" json:"quantity"`
	TransactionType string    `gorm:"size:50;not null;index" json:"transaction_type"`
	Reason          string    `gorm:"type:text" json:"reason"`
}
