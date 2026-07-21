package service

import (
	"net/http"
	"time"

	"backend/internal/domain"
	"backend/internal/dto"
	"backend/internal/repository"
	"backend/internal/utils"

	"gorm.io/gorm"
)

type AuthService struct {
	repo      *repository.AuthRepository
	jwtSecret string
}

func NewAuthService(db *gorm.DB, jwtSecret string) *AuthService {
	return &AuthService{
		repo:      repository.NewAuthRepository(db),
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) StaffLogin(input dto.StaffLoginRequest) (string, error) {
	user, err := s.repo.GetStaffByUsername(input.Username)
	if err != nil {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	if !utils.CheckPassword(user.Password, input.Password) {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	return utils.GenerateToken(s.jwtSecret, user.ID.String(), "staff", 24*time.Hour)
}

func (s *AuthService) RegisterCustomer(input dto.CustomerRegisterRequest) (*domain.Customer, string, error) {
	hashed, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, "", err
	}

	tx := s.repo.DB().Begin()
	if tx.Error != nil {
		return nil, "", tx.Error
	}

	user := &domain.User{
		Name:     input.Name,
		Username: input.Phone,
		Password: hashed,
		Role:     "customer",
	}
	if err := s.repo.CreateUser(tx, user); err != nil {
		tx.Rollback()
		return nil, "", utils.NewAppError(http.StatusConflict, "phone already registered")
	}

	customer := &domain.Customer{
		Name:  input.Name,
		Phone: input.Phone,
	}
	if err := s.repo.CreateCustomer(tx, customer); err != nil {
		tx.Rollback()
		return nil, "", utils.NewAppError(http.StatusConflict, "phone already registered")
	}

	if err := tx.Commit().Error; err != nil {
		return nil, "", err
	}

	token, err := utils.GenerateToken(s.jwtSecret, customer.ID.String(), "customer", 7*24*time.Hour)
	if err != nil {
		return nil, "", err
	}
	return customer, token, nil
}

func (s *AuthService) CustomerLogin(input dto.CustomerLoginRequest) (*domain.Customer, string, error) {
	customer, err := s.repo.GetCustomerByPhone(input.Phone)
	if err != nil {
		return nil, "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	user, err := s.repo.GetUserByUsername(input.Phone)
	if err != nil || user.Role != "customer" {
		return nil, "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	if !utils.CheckPassword(user.Password, input.Password) {
		return nil, "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	token, err := utils.GenerateToken(s.jwtSecret, customer.ID.String(), "customer", 7*24*time.Hour)
	if err != nil {
		return nil, "", err
	}
	return customer, token, nil
}
