package handler

import (
	"encoding/json"
	"net/http"

	"backend/internal/notify"
	"backend/internal/service"
	"backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CRUDHandler[T any] struct {
	service *service.CRUDService[T]
	name    string
}

func NewCRUDHandler[T any](service *service.CRUDService[T], name string) *CRUDHandler[T] {
	return &CRUDHandler[T]{service: service, name: name}
}

func (h *CRUDHandler[T]) Register(r gin.IRoutes, path string) {
	r.GET(path, h.List)
	r.GET(path+"/:id", h.GetByID)
	r.POST(path, h.Create)
	r.PUT(path+"/:id", h.Update)
	r.DELETE(path+"/:id", h.Delete)
}

func catalogAffectsMenu(name string) bool {
	switch name {
	case "product", "category", "product size":
		return true
	default:
		return false
	}
}

func payloadID(payload any) string {
	b, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return ""
	}
	if id, ok := m["id"].(string); ok {
		return id
	}
	return ""
}

func (h *CRUDHandler[T]) triggerMenuISR(itemID string) {
	if !catalogAffectsMenu(h.name) {
		return
	}
	notify.RevalidateWebsiteMenu(h.name, itemID)
}

func (h *CRUDHandler[T]) Create(c *gin.Context) {
	var payload T
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.Create(&payload); err != nil {
		HandleError(c, err)
		return
	}
	h.triggerMenuISR(payloadID(payload))
	utils.Success(c, http.StatusCreated, h.name+" created", payload)
}

func (h *CRUDHandler[T]) List(c *gin.Context) {
	limit, offset, paged := parsePage(c)
	if !paged {
		data, err := h.service.List()
		if err != nil {
			HandleError(c, err)
			return
		}
		utils.Success(c, http.StatusOK, h.name+" list", data)
		return
	}
	items, total, err := h.service.ListPaged(limit, offset)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, h.name+" list", pageResult(items, total, limit, offset))
}

func (h *CRUDHandler[T]) GetByID(c *gin.Context) {
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
	utils.Success(c, http.StatusOK, h.name+" details", data)
}

func (h *CRUDHandler[T]) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	updates := map[string]any{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.Update(id, updates); err != nil {
		HandleError(c, err)
		return
	}
	h.triggerMenuISR(id.String())
	utils.Success(c, http.StatusOK, h.name+" updated", nil)
}

func (h *CRUDHandler[T]) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.service.Delete(id); err != nil {
		HandleError(c, err)
		return
	}
	h.triggerMenuISR(id.String())
	utils.Success(c, http.StatusOK, h.name+" deleted", nil)
}
