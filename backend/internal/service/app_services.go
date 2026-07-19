package service

import (
	"backend/internal/domain"
	"backend/internal/repository"

	"gorm.io/gorm"
)

type AppServices struct {
	Auth         *AuthService
	Categories   *CRUDService[domain.Category]
	Products     *CRUDService[domain.Product]
	ProductSizes *CRUDService[domain.ProductSize]
	Locations    *CRUDService[domain.Location]
	Offers       *OfferService
	Inventory    *CRUDService[domain.Inventory]
	Recipes      *CRUDService[domain.Recipe]
	Orders       *OrderService
	Payments     *PaymentService
	Analytics    *AnalyticsService
	Settings     *SettingService
}

func NewAppServices(db *gorm.DB, jwtSecret string) *AppServices {
	return &AppServices{
		Auth:         NewAuthService(db, jwtSecret),
		Categories:   NewCRUDService(repository.NewGenericRepository[domain.Category](db)),
		Products:     NewCRUDService(repository.NewGenericRepository[domain.Product](db)),
		ProductSizes: NewCRUDService(repository.NewGenericRepository[domain.ProductSize](db)),
		Locations:    NewCRUDService(repository.NewGenericRepository[domain.Location](db)),
		Offers:       NewOfferService(db),
		Inventory:    NewCRUDService(repository.NewGenericRepository[domain.Inventory](db)),
		Recipes:      NewCRUDService(repository.NewGenericRepository[domain.Recipe](db)),
		Orders:       NewOrderService(db),
		Payments:     NewPaymentService(db),
		Analytics:    NewAnalyticsService(db),
		Settings:     NewSettingService(db),
	}
}
