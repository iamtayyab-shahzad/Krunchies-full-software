package database

import (
	"fmt"
	"net/url"
	"strings"

	"backend/internal/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := buildDSN(cfg)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 28P01") {
			return nil, fmt.Errorf(
				"authentication failed for user=%s db=%s host=%s port=%s: %w",
				cfg.User,
				cfg.Name,
				cfg.Host,
				cfg.Port,
				err,
			)
		}

		return nil, fmt.Errorf(
			"database connection failed for user=%s db=%s host=%s port=%s: %w",
			cfg.User,
			cfg.Name,
			cfg.Host,
			cfg.Port,
			err,
		)
	}

	return db, nil
}

func buildDSN(cfg config.DatabaseConfig) string {
	password := url.QueryEscape(cfg.Password)
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host,
		cfg.Port,
		cfg.User,
		password,
		cfg.Name,
		cfg.SSLMode,
	)
}
