package service

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"backend/internal/domain"
	"backend/internal/dto"
	"backend/internal/utils"

	"gorm.io/gorm"
)

type SettingService struct {
	db *gorm.DB
}

func NewSettingService(db *gorm.DB) *SettingService {
	return &SettingService{db: db}
}

func (s *SettingService) Get() (*domain.Setting, error) {
	var setting domain.Setting
	err := s.db.First(&setting).Error
	if err == gorm.ErrRecordNotFound {
		setting = domain.Setting{
			RestaurantName:    "Krunchies Pizza",
			Phone:             "",
			WhatsApp:          "",
			Currency:          "Rs",
			CashOnDeliveryFee: 0,
			OpeningTime:       "11:00 AM",
			ClosingTime:       "11:00 PM",
		}
		if createErr := s.db.Create(&setting).Error; createErr != nil {
			return nil, createErr
		}
		return &setting, nil
	}
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

// UpdateFromDTO applies partial settings via struct fields so GORM maps
// column names correctly (e.g. WhatsApp -> whats_app).
func (s *SettingService) UpdateFromDTO(input dto.UpdateSettingsRequest) (*domain.Setting, error) {
	current, err := s.Get()
	if err != nil {
		return nil, err
	}

	patch := domain.Setting{}
	cols := make([]string, 0, 12)
	if input.RestaurantName != nil {
		patch.RestaurantName = *input.RestaurantName
		cols = append(cols, "RestaurantName")
	}
	if input.Phone != nil {
		patch.Phone = *input.Phone
		cols = append(cols, "Phone")
	}
	if input.WhatsApp != nil {
		patch.WhatsApp = *input.WhatsApp
		cols = append(cols, "WhatsApp")
	}
	if input.Logo != nil {
		patch.Logo = *input.Logo
		cols = append(cols, "Logo")
	}
	if input.Address != nil {
		patch.Address = *input.Address
		cols = append(cols, "Address")
	}
	if input.OpeningTime != nil {
		patch.OpeningTime = *input.OpeningTime
		cols = append(cols, "OpeningTime")
	}
	if input.ClosingTime != nil {
		patch.ClosingTime = *input.ClosingTime
		cols = append(cols, "ClosingTime")
	}
	if input.CashOnDeliveryFee != nil {
		patch.CashOnDeliveryFee = *input.CashOnDeliveryFee
		cols = append(cols, "CashOnDeliveryFee")
	}
	if input.Currency != nil {
		patch.Currency = *input.Currency
		cols = append(cols, "Currency")
	}
	if input.GoogleMaps != nil {
		patch.GoogleMaps = *input.GoogleMaps
		cols = append(cols, "GoogleMaps")
	}
	if input.Facebook != nil {
		patch.Facebook = *input.Facebook
		cols = append(cols, "Facebook")
	}
	if input.Instagram != nil {
		patch.Instagram = *input.Instagram
		cols = append(cols, "Instagram")
	}
	if len(cols) == 0 {
		return nil, utils.NewAppError(http.StatusBadRequest, "no fields to update")
	}

	if err := s.db.Model(current).Select(cols).Updates(patch).Error; err != nil {
		// #region agent log
		func() {
			f, e := os.OpenFile(`C:\Users\admin\Desktop\summer_work\krunchies-full-setup\debug-ec6f7f.log`, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if e != nil {
				return
			}
			defer f.Close()
			b, _ := json.Marshal(map[string]any{
				"sessionId":    "ec6f7f",
				"hypothesisId": "S500",
				"location":     "setting_service.go:UpdateFromDTO",
				"message":      "settings update failed",
				"data":         map[string]any{"err": err.Error(), "cols": cols},
				"timestamp":    time.Now().UnixMilli(),
			})
			_, _ = f.Write(append(b, '\n'))
		}()
		// #endregion
		return nil, err
	}
	return s.Get()
}
