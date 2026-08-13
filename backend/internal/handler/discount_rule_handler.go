package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend/internal/domain"
	"backend/internal/service"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DiscountRuleHandler struct {
	service *service.DiscountRuleService
}

func NewDiscountRuleHandler(service *service.DiscountRuleService) *DiscountRuleHandler {
	return &DiscountRuleHandler{service: service}
}

type discountRuleRequest struct {
	Name         string     `json:"name"`
	Active       *bool      `json:"active"`
	Percent      int        `json:"percent"`
	MinSubtotal  int        `json:"min_subtotal"`
	ScheduleType string     `json:"schedule_type"`
	StartDate    *time.Time `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
	Weekdays     []int      `json:"weekdays"`
	WeekdaysJSON string     `json:"weekdays_json"`
	ExcludeDeals *bool      `json:"exclude_deals"`
}

func (h *DiscountRuleHandler) List(c *gin.Context) {
	data, err := h.service.List()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "discount rules", data)
}

func (h *DiscountRuleHandler) ListActive(c *gin.Context) {
	data, err := h.service.ListActive()
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "active discount rules", data)
}

func (h *DiscountRuleHandler) GetByID(c *gin.Context) {
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
	utils.Success(c, http.StatusOK, "discount rule", data)
}

func (h *DiscountRuleHandler) Create(c *gin.Context) {
	var req discountRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	rule := requestToRule(req)
	if err := h.service.Create(&rule); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "discount rule created", rule)
}

func (h *DiscountRuleHandler) Update(c *gin.Context) {
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
	utils.Success(c, http.StatusOK, "discount rule updated", nil)
}

func (h *DiscountRuleHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.service.Delete(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "discount rule deleted", nil)
}

func (h *DiscountRuleHandler) Enable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.service.Enable(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "discount rule enabled", nil)
}

func (h *DiscountRuleHandler) Disable(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.service.Disable(id); err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "discount rule disabled", nil)
}

func requestToRule(req discountRuleRequest) domain.DiscountRule {
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	exclude := true
	if req.ExcludeDeals != nil {
		exclude = *req.ExcludeDeals
	}
	weekdaysJSON := strings.TrimSpace(req.WeekdaysJSON)
	if len(req.Weekdays) > 0 {
		b, _ := json.Marshal(req.Weekdays)
		weekdaysJSON = string(b)
	}
	if weekdaysJSON == "" {
		weekdaysJSON = "[]"
	}
	return domain.DiscountRule{
		Name:         req.Name,
		Active:       active,
		Percent:      req.Percent,
		MinSubtotal:  req.MinSubtotal,
		ScheduleType: req.ScheduleType,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		WeekdaysJSON: weekdaysJSON,
		ExcludeDeals: exclude,
	}
}
