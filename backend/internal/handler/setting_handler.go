package handler

import (
	"net/http"

	"backend/internal/service"
	"backend/internal/utils"
	"github.com/gin-gonic/gin"
)

type SettingHandler struct {
	service *service.SettingService
}

func NewSettingHandler(service *service.SettingService) *SettingHandler {
	return &SettingHandler{service: service}
}

func (h *SettingHandler) Get(c *gin.Context) {
	setting, err := h.service.Get()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "settings", setting)
}

func (h *SettingHandler) Update(c *gin.Context) {
	updates := map[string]any{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	setting, err := h.service.Update(updates)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "settings updated", setting)
}
