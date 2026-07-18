package service

import (
	"backend/internal/domain"

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
		setting = domain.Setting{}
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

func (s *SettingService) Update(updates map[string]any) (*domain.Setting, error) {
	current, err := s.Get()
	if err != nil {
		return nil, err
	}
	if err := s.db.Model(&domain.Setting{}).Where("id = ?", current.ID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.Get()
}
