package service

import (
	"net/http"
	"time"

	"backend/internal/domain"
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

type StaffLoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type CustomerRegisterInput struct {
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

type CustomerLoginInput struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (s *AuthService) StaffLogin(input StaffLoginInput) (string, error) {
	user, err := s.repo.GetStaffByUsername(input.Username)
	if err != nil {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	if !utils.CheckPassword(user.Password, input.Password) {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	return utils.GenerateToken(s.jwtSecret, user.ID.String(), "staff", 24*time.Hour)
}

func (s *AuthService) RegisterCustomer(input CustomerRegisterInput) (*domain.Customer, string, error) {
	hashed, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, "", err
	}
	customer := &domain.Customer{
		Name:  input.Name,
		Phone: input.Phone,
	}
	user := &domain.User{
		Name:     input.Name,
		Username: input.Phone,
		Password: hashed,
	}
	if err := s.repo.CreateUser(user); err != nil {
		return nil, "", err
	}

	if err := s.repo.CreateCustomer(customer); err != nil {
		return nil, "", err
	}

	customerToken, err := utils.GenerateToken(s.jwtSecret, customer.ID.String(), "customer", 7*24*time.Hour)
	if err != nil {
		return nil, "", err
	}
	return customer, customerToken, nil
}

func (s *AuthService) CustomerLogin(input CustomerLoginInput) (string, error) {
	customer, err := s.repo.GetCustomerByPhone(input.Phone)
	if err != nil {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	user, err := s.repo.GetUserByUsername(input.Phone)
	if err != nil {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	if !utils.CheckPassword(user.Password, input.Password) {
		return "", utils.NewAppError(http.StatusUnauthorized, "invalid credentials")
	}
	return utils.GenerateToken(s.jwtSecret, customer.ID.String(), "customer", 7*24*time.Hour)
}
