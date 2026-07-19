package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/domain"
	"backend/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func main() {
	username := envOr("SEED_USERNAME", "admin")
	password := envOr("SEED_PASSWORD", "admin123")
	name := envOr("SEED_NAME", "Admin")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	hashed, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}

	var existing domain.User
	err = db.Where("username = ?", username).First(&existing).Error
	if err == nil {
		if err := db.Model(&existing).Updates(map[string]any{
			"password":   hashed,
			"name":       name,
			"role":       "staff",
			"updated_at": time.Now(),
		}).Error; err != nil {
			log.Fatalf("update user: %v", err)
		}
		fmt.Printf("Updated staff user: username=%s role=staff\n", username)
		return
	}
	if err != gorm.ErrRecordNotFound {
		log.Fatalf("lookup: %v", err)
	}

	user := domain.User{
		BaseModel: domain.BaseModel{
			ID:        uuid.New(),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:     name,
		Username: username,
		Password: hashed,
		Role:     "staff",
	}

	if err := db.Create(&user).Error; err != nil {
		log.Fatalf("create user: %v", err)
	}

	fmt.Printf("Created staff user: username=%s role=staff\n", username)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
