package routes

import (
	"net/http"

	"backend/internal/domain"
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/service"
	"github.com/gin-gonic/gin"
)

func SetupRouter(services *service.AppServices, jwtSecret string) *gin.Engine {
	router := gin.Default()
	router.Use(middleware.RequestLogger(), middleware.ErrorRecovery())

	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Krunchies Backend Running",
		})
	})

	authHandler := handler.NewAuthHandler(services.Auth)
	categoryHandler := handler.NewCRUDHandler[domain.Category](services.Categories, "category")
	productHandler := handler.NewCRUDHandler[domain.Product](services.Products, "product")
	productSizeHandler := handler.NewCRUDHandler[domain.ProductSize](services.ProductSizes, "product size")
	locationHandler := handler.NewCRUDHandler[domain.Location](services.Locations, "location")
	offerHandler := handler.NewOfferHandler(services.Offers)
	inventoryHandler := handler.NewCRUDHandler[domain.Inventory](services.Inventory, "inventory")
	recipeHandler := handler.NewCRUDHandler[domain.Recipe](services.Recipes, "recipe")
	orderHandler := handler.NewOrderHandler(services.Orders)
	analyticsHandler := handler.NewAnalyticsHandler(services.Analytics)
	settingHandler := handler.NewSettingHandler(services.Settings)

	api := router.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/staff/login", authHandler.StaffLogin)
			auth.POST("/customers/register", authHandler.CustomerRegister)
			auth.POST("/customers/login", authHandler.CustomerLogin)
		}

		orders := api.Group("/orders")
		{
			orders.POST("", orderHandler.Create)
			orders.POST("/phone", orderHandler.Create)
			orders.POST("/walkin", orderHandler.Create)
		}

		staff := api.Group("")
		staff.Use(middleware.JWTAuth(jwtSecret, "staff"))
		{
			categoryHandler.Register(staff, "/categories")
			productHandler.Register(staff, "/products")
			productSizeHandler.Register(staff, "/product-sizes")
			locationHandler.Register(staff, "/locations")
			offerHandler.Register(staff, "/offers")
			inventoryHandler.Register(staff, "/inventory")
			recipeHandler.Register(staff, "/recipes")

			staff.GET("/orders", orderHandler.List)
			staff.GET("/orders/:id", orderHandler.GetByID)
			staff.PUT("/orders/:id", orderHandler.Update)
			staff.PATCH("/orders/:id/cancel", orderHandler.Cancel)
			staff.PATCH("/orders/:id/complete", orderHandler.Complete)

			staff.GET("/analytics/today-sales", analyticsHandler.TodaySales)
			staff.GET("/analytics/yesterday-sales", analyticsHandler.YesterdaySales)
			staff.GET("/analytics/weekly-sales", analyticsHandler.WeeklySales)
			staff.GET("/analytics/monthly-sales", analyticsHandler.MonthlySales)
			staff.GET("/analytics/best-selling-products", analyticsHandler.BestSellingProducts)
			staff.GET("/analytics/cancelled-orders", analyticsHandler.CancelledOrders)
			staff.GET("/analytics/payment-breakdown", analyticsHandler.PaymentBreakdown)
			staff.GET("/analytics/remaining-inventory", analyticsHandler.RemainingInventory)

			staff.GET("/settings", settingHandler.Get)
			staff.PUT("/settings", settingHandler.Update)
		}
	}

	return router
}
