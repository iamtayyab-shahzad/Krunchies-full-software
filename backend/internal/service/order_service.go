package service

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"backend/internal/domain"
	"backend/internal/dto"
	"backend/internal/repository"
	"backend/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderService struct {
	db            *gorm.DB
	orderRepo     *repository.OrderRepository
	inventoryRepo *repository.InventoryRepository
	paymentRepo   *repository.PaymentRepository
}

func NewOrderService(db *gorm.DB) *OrderService {
	return &OrderService{
		db:            db,
		orderRepo:     repository.NewOrderRepository(db),
		inventoryRepo: repository.NewInventoryRepository(db),
		paymentRepo:   repository.NewPaymentRepository(db),
	}
}

var phonePattern = regexp.MustCompile(`^[0-9+()[:space:]-]{7,20}$`)

func (s *OrderService) CreateOrder(
	input dto.CreateOrderRequest,
	orderType string,
	customerID *uuid.UUID,
) (*domain.Order, error) {
	orderType = normalizeOrderType(orderType)
	method := strings.ToLower(strings.TrimSpace(input.PaymentMethod))
	customerName := strings.TrimSpace(input.CustomerName)
	phone := strings.TrimSpace(input.Phone)
	address := strings.TrimSpace(input.Address)

	if customerName == "" {
		return nil, utils.NewAppError(http.StatusBadRequest, "customer name is required")
	}
	if !phonePattern.MatchString(phone) {
		return nil, utils.NewAppError(http.StatusBadRequest, "invalid phone number")
	}
	if (orderType == "website" || orderType == "guest" || orderType == "phone") && address == "" {
		return nil, utils.NewAppError(http.StatusBadRequest, "delivery address is required")
	}
	if len(input.Items) == 0 {
		return nil, utils.NewAppError(http.StatusBadRequest, "cart cannot be empty")
	}

	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	var location domain.Location
	if err := tx.First(&location, "id = ?", input.LocationID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, utils.NewAppError(http.StatusBadRequest, "invalid location")
		}
		return nil, err
	}

	if customerID != nil {
		var customer domain.Customer
		if err := tx.First(&customer, "id = ?", *customerID).Error; err != nil {
			tx.Rollback()
			return nil, utils.NewAppError(http.StatusUnauthorized, "customer account not found")
		}
	}

	var setting domain.Setting
	_ = tx.Order("created_at asc").First(&setting).Error
	codFee := 0
	if method == "cod" {
		codFee = setting.CashOnDeliveryFee
	}

	orderID := uuid.New()
	order := &domain.Order{
		BaseModel:       domain.BaseModel{ID: orderID},
		OrderNumber:     "KR-" + strings.ToUpper(strings.ReplaceAll(orderID.String(), "-", "")[:16]),
		CustomerID:      customerID,
		CustomerName:    customerName,
		Phone:           phone,
		Address:         address,
		LocationID:     input.LocationID,
		DeliveryCharge: location.DeliveryCharge,
		CashOnDeliveryFee: codFee,
		PaymentMethod:  method,
		OrderStatus:    "PENDING",
		OrderType:      orderType,
		OrderNotes:     input.OrderNotes,
	}

	subtotal := 0
	order.Items = make([]domain.OrderItem, 0, len(input.Items))
	for _, item := range input.Items {
		var size domain.ProductSize
		if err := tx.First(&size, "id = ?", item.ProductSizeID).Error; err != nil {
			tx.Rollback()
			return nil, utils.NewAppError(http.StatusBadRequest, "invalid product size")
		}
		if size.ProductID != item.ProductID {
			tx.Rollback()
			return nil, utils.NewAppError(http.StatusBadRequest, "product size does not belong to product")
		}

		var product domain.Product
		if err := tx.First(&product, "id = ?", item.ProductID).Error; err != nil {
			tx.Rollback()
			return nil, utils.NewAppError(http.StatusBadRequest, "invalid product")
		}
		if !product.Available {
			tx.Rollback()
			return nil, utils.NewAppError(http.StatusBadRequest, "product is unavailable: "+product.Name)
		}

		lineTotal := size.Price * item.Quantity
		subtotal += lineTotal
		order.Items = append(order.Items, domain.OrderItem{
			ProductID:     item.ProductID,
			ProductSizeID: item.ProductSizeID,
			Quantity:      item.Quantity,
			Price:         size.Price,
			SpecialInstructions: strings.TrimSpace(item.SpecialInstructions),
		})
	}

	order.Subtotal = subtotal
	order.GrandTotal = subtotal + location.DeliveryCharge + codFee

	if err := s.orderRepo.Create(tx, order); err != nil {
		tx.Rollback()
		return nil, err
	}

	payment := &domain.Payment{
		OrderID:   order.ID,
		Method:    method,
		Amount:    order.GrandTotal,
		Status:    "pending",
		Reference: "",
	}
	if err := s.paymentRepo.Create(tx, payment); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	return s.orderRepo.GetByID(order.ID)
}

func (s *OrderService) UpdateOrder(id uuid.UUID, input dto.UpdateOrderRequest) error {
	updates := map[string]any{}
	if input.CustomerName != nil {
		updates["customer_name"] = *input.CustomerName
	}
	if input.Phone != nil {
		updates["phone"] = *input.Phone
	}
	if input.Address != nil {
		updates["address"] = *input.Address
	}
	if input.LocationID != nil {
		updates["location_id"] = *input.LocationID
	}
	if input.PaymentMethod != nil {
		updates["payment_method"] = strings.ToLower(*input.PaymentMethod)
	}
	if input.OrderNotes != nil {
		updates["order_notes"] = *input.OrderNotes
	}
	if input.OrderStatus != nil {
		status := strings.ToUpper(*input.OrderStatus)
		switch status {
		case "COMPLETED":
			return s.CompleteOrder(id)
		case "CANCELLED":
			return s.CancelOrder(id)
		case "PENDING":
			updates["order_status"] = status
		default:
			return utils.NewAppError(http.StatusBadRequest, "invalid order status")
		}
	}
	if len(updates) == 0 {
		return utils.NewAppError(http.StatusBadRequest, "no fields to update")
	}

	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	current, err := s.orderRepo.GetByIDTx(tx, id)
	if err != nil {
		tx.Rollback()
		return err
	}
	if current.OrderStatus != "PENDING" {
		tx.Rollback()
		return utils.NewAppError(http.StatusConflict, "only pending orders can be edited")
	}
	if err := s.orderRepo.Update(tx, id, updates); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (s *OrderService) CancelOrder(id uuid.UUID) error {
	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	order, err := s.orderRepo.GetByIDTx(tx, id)
	if err != nil {
		tx.Rollback()
		return err
	}
	if order.OrderStatus == "CANCELLED" {
		tx.Rollback()
		return nil
	}
	if order.OrderStatus == "COMPLETED" {
		tx.Rollback()
		return utils.NewAppError(http.StatusConflict, "completed orders cannot be cancelled")
	}

	affected, err := s.orderRepo.TransitionStatus(tx, id, "PENDING", "CANCELLED")
	if err != nil {
		tx.Rollback()
		return err
	}
	if affected == 0 {
		tx.Rollback()
		return utils.NewAppError(http.StatusConflict, "order could not be cancelled")
	}

	_ = tx.Model(&domain.Payment{}).
		Where("order_id = ?", id).
		Update("status", "failed")

	return tx.Commit().Error
}

func (s *OrderService) CompleteOrder(id uuid.UUID) error {
	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	order, err := s.orderRepo.GetByIDTx(tx, id)
	if err != nil {
		tx.Rollback()
		return err
	}
	if order.OrderStatus == "COMPLETED" {
		tx.Rollback()
		return nil // idempotent
	}
	if order.OrderStatus == "CANCELLED" {
		tx.Rollback()
		return utils.NewAppError(http.StatusConflict, "cancelled orders cannot be completed")
	}

	affected, err := s.orderRepo.TransitionStatus(tx, id, "PENDING", "COMPLETED")
	if err != nil {
		tx.Rollback()
		return err
	}
	if affected == 0 {
		tx.Rollback()
		return utils.NewAppError(http.StatusConflict, "order already processed")
	}

	// Reload within same tx after transition
	order, err = s.orderRepo.GetByIDTx(tx, id)
	if err != nil {
		tx.Rollback()
		return err
	}

	if err := s.consumeInventory(tx, order); err != nil {
		tx.Rollback()
		return err
	}

	if payment, err := s.paymentRepo.GetByOrderID(id); err == nil {
		_ = tx.Model(&domain.Payment{}).Where("id = ?", payment.ID).Updates(map[string]any{
			"status": "paid",
			"amount": order.GrandTotal,
		}).Error
	}

	return tx.Commit().Error
}

func (s *OrderService) DeleteOrder(id uuid.UUID) error {
	tx := s.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	order, err := s.orderRepo.GetByIDTx(tx, id)
	if err != nil {
		tx.Rollback()
		return err
	}
	if order.OrderStatus == "COMPLETED" {
		tx.Rollback()
		return utils.NewAppError(http.StatusConflict, "completed orders cannot be deleted")
	}

	if err := tx.Where("order_id = ?", id).Delete(&domain.OrderItem{}).Error; err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Where("order_id = ?", id).Delete(&domain.Payment{}).Error; err != nil {
		tx.Rollback()
		return err
	}
	if err := s.orderRepo.Delete(tx, id); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (s *OrderService) ListOrders() ([]domain.Order, error) {
	return s.orderRepo.List()
}

func (s *OrderService) ListPendingOrders() ([]domain.Order, error) {
	return s.orderRepo.ListByStatus("PENDING")
}

func (s *OrderService) ListOrdersByType(orderType string) ([]domain.Order, error) {
	return s.orderRepo.ListByType(normalizeOrderType(orderType))
}

func (s *OrderService) GetOrderByID(id uuid.UUID) (*domain.Order, error) {
	return s.orderRepo.GetByID(id)
}

func (s *OrderService) consumeInventory(tx *gorm.DB, order *domain.Order) error {
	for _, item := range order.Items {
		recipes, err := s.inventoryRepo.GetRecipeByProductID(tx, item.ProductID)
		if err != nil {
			return err
		}
		for _, recipe := range recipes {
			consumeQty := recipe.QuantityRequired * item.Quantity
			if consumeQty <= 0 {
				continue
			}
			if _, err := s.inventoryRepo.LockInventory(tx, recipe.InventoryID); err != nil {
				return err
			}
			if err := s.inventoryRepo.DecreaseStock(tx, recipe.InventoryID, consumeQty); err != nil {
				return err
			}
			tr := &domain.InventoryTransaction{
				InventoryID:     recipe.InventoryID,
				Quantity:        -consumeQty,
				TransactionType: "CONSUMPTION",
				Reason:          fmt.Sprintf("Order %s completed", order.ID.String()),
			}
			if err := s.inventoryRepo.AddTransaction(tx, tr); err != nil {
				return err
			}
		}
	}
	return nil
}

func normalizeOrderType(orderType string) string {
	switch strings.ToLower(strings.TrimSpace(orderType)) {
	case "phone":
		return "phone"
	case "walkin", "walk-in":
		return "walkin"
	case "guest":
		return "guest"
	default:
		return "website"
	}
}

func ParseOrderID(id string) (uuid.UUID, error) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, utils.NewAppError(http.StatusBadRequest, "invalid order id")
	}
	return parsed, nil
}
