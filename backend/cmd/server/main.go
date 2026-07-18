package main

import (
	"log"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/routes"
	"backend/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	log.Printf(
		"database target host=%s port=%s db=%s user=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.Name,
		cfg.Database.User,
		cfg.Database.SSLMode,
	)

	db, err := database.Initialize(cfg.Database)
	if err != nil {
		log.Fatalf("failed to connect to PostgreSQL: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	services := service.NewAppServices(db, cfg.JWT.Secret)
	router := routes.SetupRouter(services, cfg.JWT.Secret)

	log.Printf("starting server on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}
