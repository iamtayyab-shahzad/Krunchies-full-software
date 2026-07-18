package handler

import (
	"net/http"

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

func (h *OrderHandler) Create(c *gin.Context) {
	var input service.CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	order, err := h.service.CreateOrder(input)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "order created", order)
}

func (h *OrderHandler) List(c *gin.Context) {
	orders, err := h.service.ListOrders()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "orders list", orders)
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
	updates := map[string]any{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.UpdateOrder(id, updates); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "order updated", nil)
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
