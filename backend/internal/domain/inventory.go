package domain

type Inventory struct {
	BaseModel
	Name                  string                 `gorm:"size:120;not null" json:"name"`
	Unit                  string                 `gorm:"size:30;not null" json:"unit"`
	Stock                 int                    `gorm:"not null;default:0" json:"stock"`
	PurchasePrice         int                    `gorm:"not null;default:0" json:"purchase_price"`
	MinimumStock          int                    `gorm:"not null;default:0" json:"minimum_stock"`
	Recipes               []Recipe               `gorm:"foreignKey:InventoryID" json:"recipes,omitempty"`
	InventoryTransactions []InventoryTransaction `gorm:"foreignKey:InventoryID" json:"inventory_transactions,omitempty"`
}
