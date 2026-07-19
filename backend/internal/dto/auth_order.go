package dto

import "github.com/google/uuid"

type StaffLoginRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=4"`
}

type CustomerRegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Phone    string `json:"phone" binding:"required,min=10,max=20"`
	Password string `json:"password" binding:"required,min=6,max=72"`
}

type CustomerLoginRequest struct {
	Phone    string `json:"phone" binding:"required,min=10,max=20"`
	Password string `json:"password" binding:"required"`
}

type CreateOrderItemRequest struct {
	ProductID     uuid.UUID `json:"product_id" binding:"required"`
	ProductSizeID uuid.UUID `json:"product_size_id" binding:"required"`
	Quantity      int       `json:"quantity" binding:"required,min=1"`
}

type CreateOrderRequest struct {
	CustomerName  string                   `json:"customer_name" binding:"required,min=2,max=120"`
	Phone         string                   `json:"phone" binding:"required,min=7,max=20"`
	Address       string                   `json:"address" binding:"max=500"`
	LocationID    uuid.UUID                `json:"location_id" binding:"required"`
	PaymentMethod string                   `json:"payment_method" binding:"required,oneof=cash easypaisa jazzcash card cod"`
	OrderNotes    string                   `json:"order_notes" binding:"max=2000"`
	IsGuest       bool                     `json:"is_guest"`
	Items         []CreateOrderItemRequest `json:"items" binding:"required,min=1,dive"`
}

type UpdateOrderRequest struct {
	CustomerName  *string    `json:"customer_name" binding:"omitempty,min=2,max=120"`
	Phone         *string    `json:"phone" binding:"omitempty,min=7,max=20"`
	Address       *string    `json:"address" binding:"omitempty,max=500"`
	LocationID    *uuid.UUID `json:"location_id"`
	PaymentMethod *string    `json:"payment_method" binding:"omitempty,oneof=cash easypaisa jazzcash card cod"`
	OrderNotes    *string    `json:"order_notes" binding:"omitempty,max=2000"`
	OrderStatus   *string    `json:"order_status" binding:"omitempty,oneof=PENDING COMPLETED CANCELLED"`
}

type CreatePaymentRequest struct {
	OrderID   uuid.UUID `json:"order_id" binding:"required"`
	Method    string    `json:"method" binding:"required,oneof=cash easypaisa jazzcash card cod"`
	Amount    int       `json:"amount" binding:"required,min=0"`
	Status    string    `json:"status" binding:"required,oneof=pending paid failed refunded"`
	Reference string    `json:"reference" binding:"max=120"`
}

type UpdatePaymentRequest struct {
	Method    *string `json:"method" binding:"omitempty,oneof=cash easypaisa jazzcash card cod"`
	Amount    *int    `json:"amount" binding:"omitempty,min=0"`
	Status    *string `json:"status" binding:"omitempty,oneof=pending paid failed refunded"`
	Reference *string `json:"reference" binding:"omitempty,max=120"`
}

type UpdateSettingsRequest struct {
	RestaurantName    *string `json:"restaurant_name" binding:"omitempty,min=2,max=150"`
	Phone             *string `json:"phone" binding:"omitempty,max=20"`
	WhatsApp          *string `json:"whatsapp" binding:"omitempty,max=20"`
	Logo              *string `json:"logo" binding:"omitempty,max=500"`
	OpeningTime       *string `json:"opening_time" binding:"omitempty,max=20"`
	ClosingTime       *string `json:"closing_time" binding:"omitempty,max=20"`
	CashOnDeliveryFee *int    `json:"cash_on_delivery_fee" binding:"omitempty,min=0"`
	Currency          *string `json:"currency" binding:"omitempty,max=10"`
	GoogleMaps        *string `json:"google_maps" binding:"omitempty,max=500"`
	Facebook          *string `json:"facebook" binding:"omitempty,max=500"`
	Instagram         *string `json:"instagram" binding:"omitempty,max=500"`
}

type TokenResponse struct {
	Token string `json:"token"`
}

type AuthCustomerResponse struct {
	Customer any    `json:"customer"`
	Token    string `json:"token"`
}
