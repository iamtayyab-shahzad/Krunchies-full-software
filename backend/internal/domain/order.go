package domain

import "github.com/google/uuid"

type Order struct {
	BaseModel
	CustomerName   string      `gorm:"size:120;not null" json:"customer_name"`
	Phone          string      `gorm:"size:20;not null" json:"phone"`
	Address        string      `gorm:"size:500;not null" json:"address"`
	LocationID     uuid.UUID   `gorm:"type:uuid;not null;index" json:"location_id"`
	Location       Location    `gorm:"foreignKey:LocationID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"location,omitempty"`
	DeliveryCharge int         `gorm:"not null;default:0" json:"delivery_charge"`
	PaymentMethod  string      `gorm:"size:50;not null" json:"payment_method"`
	OrderStatus    string      `gorm:"size:50;not null;index" json:"order_status"`
	OrderType      string      `gorm:"size:30;not null;default:'website';index" json:"order_type"`
	OrderNotes     string      `gorm:"type:text" json:"order_notes"`
	Subtotal       int         `gorm:"not null;default:0" json:"subtotal"`
	GrandTotal     int         `gorm:"not null;default:0" json:"grand_total"`
	Items          []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	Payment        *Payment    `gorm:"foreignKey:OrderID" json:"payment,omitempty"`
}
