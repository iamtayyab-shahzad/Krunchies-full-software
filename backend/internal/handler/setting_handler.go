package handler

import (
	"net/http"

	"backend/internal/dto"
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
	var input dto.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	updates := map[string]any{}
	if input.RestaurantName != nil {
		updates["restaurant_name"] = *input.RestaurantName
	}
	if input.Phone != nil {
		updates["phone"] = *input.Phone
	}
	if input.WhatsApp != nil {
		updates["whatsapp"] = *input.WhatsApp
	}
	if input.Logo != nil {
		updates["logo"] = *input.Logo
	}
	if input.OpeningTime != nil {
		updates["opening_time"] = *input.OpeningTime
	}
	if input.ClosingTime != nil {
		updates["closing_time"] = *input.ClosingTime
	}
	if input.CashOnDeliveryFee != nil {
		updates["cash_on_delivery_fee"] = *input.CashOnDeliveryFee
	}
	if input.Currency != nil {
		updates["currency"] = *input.Currency
	}
	if input.GoogleMaps != nil {
		updates["google_maps"] = *input.GoogleMaps
	}
	if input.Facebook != nil {
		updates["facebook"] = *input.Facebook
	}
	if input.Instagram != nil {
		updates["instagram"] = *input.Instagram
	}
	if len(updates) == 0 {
		utils.Error(c, http.StatusBadRequest, "no fields to update")
		return
	}
	setting, err := h.service.Update(updates)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "settings updated", setting)
}
