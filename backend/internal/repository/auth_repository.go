package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) GetStaffByUsername(username string) (*domain.User, error) {
	var user domain.User
	// Accept legacy rows with empty role while enforcing staff for new accounts.
	if err := r.db.
		Where("username = ? AND (role = ? OR role = '' OR role IS NULL)", username, "staff").
		First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) GetCustomerByPhone(phone string) (*domain.Customer, error) {
	var customer domain.Customer
	if err := r.db.Where("phone = ?", phone).First(&customer).Error; err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *AuthRepository) GetUserByUsername(username string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) CreateUser(tx *gorm.DB, user *domain.User) error {
	return tx.Create(user).Error
}

func (r *AuthRepository) CreateCustomer(tx *gorm.DB, customer *domain.Customer) error {
	return tx.Create(customer).Error
}

func (r *AuthRepository) DB() *gorm.DB {
	return r.db
}
