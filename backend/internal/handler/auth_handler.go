package handler

import (
	"net/http"

	"backend/internal/service"
	"backend/internal/utils"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(service *service.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

func (h *AuthHandler) StaffLogin(c *gin.Context) {
	var input service.StaffLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	token, err := h.service.StaffLogin(input)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "staff login successful", gin.H{"token": token})
}

func (h *AuthHandler) CustomerRegister(c *gin.Context) {
	var input service.CustomerRegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	customer, token, err := h.service.RegisterCustomer(input)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusCreated, "customer registered", gin.H{"customer": customer, "token": token})
}

func (h *AuthHandler) CustomerLogin(c *gin.Context) {
	var input service.CustomerLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	token, err := h.service.CustomerLogin(input)
	if err != nil {
		HandleError(c, err)
		return
	}
	utils.Success(c, http.StatusOK, "customer login successful", gin.H{"token": token})
}
