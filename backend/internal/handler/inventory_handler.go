package handler

import (
	"net/http"

	"backend/internal/service"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InventoryHandler struct {
	service *service.InventoryService
}

func NewInventoryHandler(s *service.InventoryService) *InventoryHandler {
	return &InventoryHandler{service: s}
}

func (h *InventoryHandler) List(c *gin.Context) {
	data, err := h.service.List()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "inventory list", data)
}

func (h *InventoryHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	data, err := h.service.GetByID(id)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "inventory details", data)
}

func (h *InventoryHandler) Create(c *gin.Context) {
	var in service.InventoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	data, err := h.service.Create(in)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "inventory created", data)
}

func (h *InventoryHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	var in service.InventoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.Update(id, in); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "inventory updated", nil)
}

func (h *InventoryHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.service.Delete(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "inventory deleted", nil)
}

func (h *InventoryHandler) Wastage(c *gin.Context) {
	var in service.StockChangeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.RecordWastage(in); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "wastage recorded", nil)
}

func (h *InventoryHandler) Adjust(c *gin.Context) {
	var in service.StockChangeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.AdjustStock(in); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "stock adjusted", nil)
}

func (h *InventoryHandler) BulkSave(c *gin.Context) {
	var in service.BulkStockInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.BulkSave(in); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "inventory saved", nil)
}

func (h *InventoryHandler) Alerts(c *gin.Context) {
	data, err := h.service.Alerts()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "inventory alerts", data)
}

func (h *InventoryHandler) Recommendations(c *gin.Context) {
	data, err := h.service.RecommendPurchases(14, 7)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "purchase recommendations", data)
}
