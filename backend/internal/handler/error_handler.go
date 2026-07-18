package handler

import (
	"errors"
	"net/http"

	"backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func HandleError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	var appErr *utils.AppError
	if errors.As(err, &appErr) {
		utils.Error(c, appErr.Status, appErr.Message)
		return
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		utils.Error(c, http.StatusNotFound, "resource not found")
		return
	}

	utils.Error(c, http.StatusInternalServerError, "internal server error")
}
