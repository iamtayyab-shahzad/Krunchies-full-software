package routes

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"backend/internal/domain"
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

func SetupRouter(services *service.AppServices, jwtSecret string) *gin.Engine {
	router := gin.New()
	router.Use(
		middleware.RequestID(),
		middleware.CORS(),
		middleware.RequestLogger(),
		middleware.ErrorRecovery(),
	)

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Krunchies Backend Running",
			"docs":    "/swagger/index.html",
		})
	})

	router.Static("/swagger", "./docs/swagger")
	router.StaticFile("/openapi.yaml", "./docs/openapi.yaml")

	authHandler := handler.NewAuthHandler(services.Auth)
	categoryHandler := handler.NewCRUDHandler[domain.Category](services.Categories, "category")
	productHandler := handler.NewCRUDHandler[domain.Product](services.Products, "product")
	productSizeHandler := handler.NewCRUDHandler[domain.ProductSize](services.ProductSizes, "product size")
	locationHandler := handler.NewCRUDHandler[domain.Location](services.Locations, "location")
	offerHandler := handler.NewOfferHandler(services.Offers)
	inventoryHandler := handler.NewCRUDHandler[domain.Inventory](services.Inventory, "inventory")
	inventoryTxHandler := handler.NewInventoryTransactionHandler(services.InventoryTransactions)
	recipeHandler := handler.NewCRUDHandler[domain.Recipe](services.Recipes, "recipe")
	orderHandler := handler.NewOrderHandler(services.Orders)
	paymentHandler := handler.NewPaymentHandler(services.Payments)
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

		// Public order creation (guest checkout supported)
		ordersPublic := api.Group("/orders")
		ordersPublic.Use(middleware.OptionalJWT(jwtSecret, "customer", "staff"))
		{
			ordersPublic.POST("", orderHandler.Create)
		}

		// Public settings read for website/POS bootstrap
		api.GET("/settings/public", settingHandler.Get)

		// Public catalog reads used by Website (and POS can also call these)
		api.GET("/categories", categoryHandler.List)
		api.GET("/categories/:id", categoryHandler.GetByID)
		api.GET("/products", productHandler.List)
		api.GET("/products/:id", productHandler.GetByID)
		api.GET("/product-sizes", productSizeHandler.List)
		api.GET("/product-sizes/:id", productSizeHandler.GetByID)
		api.GET("/locations", locationHandler.List)
		api.GET("/locations/:id", locationHandler.GetByID)
		api.GET("/offers", offerHandler.List)
		api.GET("/offers/:id", offerHandler.GetByID)

		// #region agent log
		func() {
			if f, ferr := os.OpenFile(`C:\Users\admin\Desktop\summer_work\krunchies-full-setup\debug-b5f52e.log`, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); ferr == nil {
				defer f.Close()
				fmt.Fprintf(f, "{\"sessionId\":\"b5f52e\",\"runId\":\"post-fix\",\"hypothesisId\":\"A\",\"location\":\"routes.go:77\",\"message\":\"public catalog GET routes registered (no JWT) - running current source\",\"data\":{\"routes\":[\"/categories\",\"/products\",\"/product-sizes\",\"/locations\",\"/offers\"]},\"timestamp\":%d}\n", time.Now().UnixMilli())
			}
		}()
		// #endregion

		staff := api.Group("")
		staff.Use(middleware.JWTAuth(jwtSecret, "staff"))
		{
			// Mutations require staff JWT
			staff.POST("/categories", categoryHandler.Create)
			staff.PUT("/categories/:id", categoryHandler.Update)
			staff.DELETE("/categories/:id", categoryHandler.Delete)

			staff.POST("/products", productHandler.Create)
			staff.PUT("/products/:id", productHandler.Update)
			staff.DELETE("/products/:id", productHandler.Delete)

			staff.POST("/product-sizes", productSizeHandler.Create)
			staff.PUT("/product-sizes/:id", productSizeHandler.Update)
			staff.DELETE("/product-sizes/:id", productSizeHandler.Delete)

			staff.POST("/locations", locationHandler.Create)
			staff.PUT("/locations/:id", locationHandler.Update)
			staff.DELETE("/locations/:id", locationHandler.Delete)

			staff.POST("/offers", offerHandler.Create)
			staff.PUT("/offers/:id", offerHandler.Update)
			staff.DELETE("/offers/:id", offerHandler.Delete)
			staff.PATCH("/offers/:id/enable", offerHandler.Enable)
			staff.PATCH("/offers/:id/disable", offerHandler.Disable)

			inventoryHandler.Register(staff, "/inventory")
			recipeHandler.Register(staff, "/recipes")

			staff.GET("/inventory/transactions", inventoryTxHandler.List)

			staff.GET("/orders", orderHandler.List)
			staff.POST("/orders/phone", orderHandler.CreatePhone)
			staff.POST("/orders/walkin", orderHandler.CreateWalkin)
			staff.GET("/orders/pending", orderHandler.ListPending)
			staff.GET("/orders/phone", orderHandler.ListPhone)
			staff.GET("/orders/walkin", orderHandler.ListWalkin)
			staff.GET("/orders/:id", orderHandler.GetByID)
			staff.PUT("/orders/:id", orderHandler.Update)
			staff.DELETE("/orders/:id", orderHandler.Delete)
			staff.PATCH("/orders/:id/cancel", orderHandler.Cancel)
			staff.PATCH("/orders/:id/complete", orderHandler.Complete)

			staff.GET("/payments", paymentHandler.List)
			staff.POST("/payments", paymentHandler.Create)
			staff.GET("/payments/:id", paymentHandler.GetByID)
			staff.PUT("/payments/:id", paymentHandler.Update)
			staff.DELETE("/payments/:id", paymentHandler.Delete)

			staff.GET("/analytics/today-sales", analyticsHandler.TodaySales)
			staff.GET("/analytics/yesterday-sales", analyticsHandler.YesterdaySales)
			staff.GET("/analytics/weekly-sales", analyticsHandler.WeeklySales)
			staff.GET("/analytics/monthly-sales", analyticsHandler.MonthlySales)
			staff.GET("/analytics/best-selling-products", analyticsHandler.BestSellingProducts)
			staff.GET("/analytics/cancelled-orders", analyticsHandler.CancelledOrders)
			staff.GET("/analytics/payment-breakdown", analyticsHandler.PaymentBreakdown)
			staff.GET("/analytics/remaining-inventory", analyticsHandler.RemainingInventory)
			staff.GET("/analytics/low-stock", analyticsHandler.LowStockItems)

			staff.GET("/settings", settingHandler.Get)
			staff.PUT("/settings", settingHandler.Update)
		}
	}

	return router
}
