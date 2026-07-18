package service

import (
	"fmt"
	"net/http"

	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderService struct {
	db            *gorm.DB
	orderRepo     *repository.OrderRepository
	inventoryRepo *repository.InventoryRepository
}

func NewOrderService(db *gorm.DB) *OrderService {
	return &OrderService{
		db:            db,
		orderRepo:     repository.NewOrderRepository(db),
		inventoryRepo: repository.NewInventoryRepository(db),
	}
}

type CreateOrderItemInput struct {
	ProductID     uuid.UUID `json:"product_id" binding:"required"`
	ProductSizeID uuid.UUID `json:"product_size_id" binding:"required"`
	Quantity      int       `json:"quantity" binding:"required,min=1"`
	Price         int       `json:"price" binding:"required,min=0"`
}

type CreateOrderInput struct {
	CustomerName   string                 `json:"customer_name" binding:"required"`
	Phone          string                 `json:"phone" binding:"required"`
	Address        string                 `json:"address"`
	LocationID     uuid.UUID              `json:"location_id" binding:"required"`
	DeliveryCharge int                    `json:"delivery_charge"`
	PaymentMethod  string                 `json:"payment_method" binding:"required"`
	OrderStatus    string                 `json:"order_status"`
	OrderNotes     string                 `json:"order_notes"`
	Subtotal       int                    `json:"subtotal"`
	GrandTotal     int                    `json:"grand_total"`
	Items          []CreateOrderItemInput `json:"items" binding:"required,min=1,dive"`
}

func (s *OrderService) CreateOrder(input CreateOrderInput) (*domain.Order, error) {
	if input.OrderStatus == "" {
		input.OrderStatus = "PENDING"
	}

	order := &domain.Order{
		CustomerName:   input.CustomerName,
		Phone:          input.Phone,
		Address:        input.Address,
		LocationID:     input.LocationID,
		DeliveryCharge: input.DeliveryCharge,
		PaymentMethod:  input.PaymentMethod,
		OrderStatus:    input.OrderStatus,
		OrderNotes:     input.OrderNotes,
		Subtotal:       input.Subtotal,
		GrandTotal:     input.GrandTotal,
	}

	order.Items = make([]domain.OrderItem, 0, len(input.Items))
	for _, item := range input.Items {
		order.Items = append(order.Items, domain.OrderItem{
			ProductID:     item.ProductID,
			ProductSizeID: item.ProductSizeID,
			Quantity:      item.Quantity,
			Price:         item.Price,
		})
	}

	tx := s.db.Begin()
	if err := s.orderRepo.Create(tx, order); err != nil {
		tx.Rollback()
		return nil, err
	}

	if order.OrderStatus == "COMPLETED" {
		if err := s.consumeInventory(tx, order); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return s.orderRepo.GetByID(order.ID)
}

func (s *OrderService) UpdateOrder(id uuid.UUID, updates map[string]any) error {
	tx := s.db.Begin()
	if err := s.orderRepo.Update(tx, id, updates); err != nil {
		tx.Rollback()
		return err
	}

	if status, ok := updates["order_status"].(string); ok && status == "COMPLETED" {
		order, err := s.orderRepo.GetByID(id)
		if err != nil {
			tx.Rollback()
			return err
		}
		if err := s.consumeInventory(tx, order); err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

func (s *OrderService) CancelOrder(id uuid.UUID) error {
	return s.UpdateOrder(id, map[string]any{"order_status": "CANCELLED"})
}

func (s *OrderService) CompleteOrder(id uuid.UUID) error {
	return s.UpdateOrder(id, map[string]any{"order_status": "COMPLETED"})
}

func (s *OrderService) ListOrders() ([]domain.Order, error) {
	return s.orderRepo.List()
}

func (s *OrderService) GetOrderByID(id uuid.UUID) (*domain.Order, error) {
	return s.orderRepo.GetByID(id)
}

func (s *OrderService) consumeInventory(tx *gorm.DB, order *domain.Order) error {
	for _, item := range order.Items {
		recipes, err := s.inventoryRepo.GetRecipeByProductID(item.ProductID)
		if err != nil {
			return err
		}

		for _, recipe := range recipes {
			consumeQty := recipe.QuantityRequired * item.Quantity
			if consumeQty <= 0 {
				continue
			}

			if err := s.inventoryRepo.DecreaseStock(tx, recipe.InventoryID, consumeQty); err != nil {
				return err
			}

			reason := fmt.Sprintf("Order %s completed", order.ID.String())
			tr := &domain.InventoryTransaction{
				InventoryID:     recipe.InventoryID,
				Quantity:        -consumeQty,
				TransactionType: "CONSUMPTION",
				Reason:          reason,
			}
			if err := s.inventoryRepo.AddTransaction(tx, tr); err != nil {
				return err
			}
		}
	}
	return nil
}

func ParseOrderID(id string) (uuid.UUID, error) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, utils.NewAppError(http.StatusBadRequest, "invalid order id")
	}
	return parsed, nil
}
