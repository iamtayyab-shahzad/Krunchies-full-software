package handler

import (
	"net/http"

	"backend/internal/dto"
	"backend/internal/service"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	service *service.OrderService
}

func NewOrderHandler(service *service.OrderService) *OrderHandler {
	return &OrderHandler{service: service}
}

func (h *OrderHandler) createWithType(c *gin.Context, orderType string) {
	var input dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if input.IsGuest && orderType == "website" {
		orderType = "guest"
	}
	order, err := h.service.CreateOrder(input, orderType)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "order created", order)
}

// Create godoc
// @Summary Create website/guest order
// @Tags orders
// @Accept json
// @Produce json
// @Param body body dto.CreateOrderRequest true "order"
// @Success 201 {object} map[string]interface{}
// @Router /api/v1/orders [post]
func (h *OrderHandler) Create(c *gin.Context) {
	h.createWithType(c, "website")
}

func (h *OrderHandler) CreatePhone(c *gin.Context) {
	h.createWithType(c, "phone")
}

func (h *OrderHandler) CreateWalkin(c *gin.Context) {
	h.createWithType(c, "walkin")
}

func (h *OrderHandler) List(c *gin.Context) {
	orders, err := h.service.ListOrders()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "orders list", orders)
}

func (h *OrderHandler) ListPending(c *gin.Context) {
	orders, err := h.service.ListPendingOrders()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "pending orders", orders)
}

func (h *OrderHandler) ListPhone(c *gin.Context) {
	orders, err := h.service.ListOrdersByType("phone")
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "phone orders", orders)
}

func (h *OrderHandler) ListWalkin(c *gin.Context) {
	orders, err := h.service.ListOrdersByType("walkin")
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "walk-in orders", orders)
}

func (h *OrderHandler) GetByID(c *gin.Context) {
	id, err := service.ParseOrderID(c.Param("id"))
	if err != nil {
		HandleError(c, err)
		return
	}
	order, err := h.service.GetOrderByID(id)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order details", order)
}

func (h *OrderHandler) Update(c *gin.Context) {
	id, err := service.ParseOrderID(c.Param("id"))
	if err != nil {
		HandleError(c, err)
		return
	}
	var input dto.UpdateOrderRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.UpdateOrder(id, input); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order updated", nil)
}

func (h *OrderHandler) Delete(c *gin.Context) {
	id, err := service.ParseOrderID(c.Param("id"))
	if err != nil {
		HandleError(c, err)
		return
	}
	if err := h.service.DeleteOrder(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order deleted", nil)
}

func (h *OrderHandler) Cancel(c *gin.Context) {
	id, err := service.ParseOrderID(c.Param("id"))
	if err != nil {
		HandleError(c, err)
		return
	}
	if err := h.service.CancelOrder(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order cancelled", nil)
}

func (h *OrderHandler) Complete(c *gin.Context) {
	id, err := service.ParseOrderID(c.Param("id"))
	if err != nil {
		HandleError(c, err)
		return
	}
	if err := h.service.CompleteOrder(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order completed", nil)
}
