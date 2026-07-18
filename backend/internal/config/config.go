package config

import (
	"fmt"
	"os"
	"sync"

	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	Port       string           `validate:"required,numeric"`
	Database   DatabaseConfig   `validate:"required"`
	JWT        JWTConfig        `validate:"required"`
	Cloudinary CloudinaryConfig `validate:"required"`
}

type DatabaseConfig struct {
	Host     string `validate:"required,hostname|ip"`
	Port     string `validate:"required,numeric"`
	User     string `validate:"required"`
	Password string `validate:"required"`
	Name     string `validate:"required"`
	SSLMode  string `validate:"required,oneof=disable allow prefer require verify-ca verify-full"`
}

type JWTConfig struct {
	Secret string `validate:"required,min=16"`
}

type CloudinaryConfig struct {
	CloudName string `validate:"required"`
	APIKey    string `validate:"required"`
	APISecret string `validate:"required"`
}

var (
	cfg     *Config
	loadErr error
	once    sync.Once
)

func Load() (*Config, error) {
	once.Do(func() {
		_ = godotenv.Load(".env", "../../.env")

		loaded := &Config{
			Port: getEnv("APP_PORT"),
			Database: DatabaseConfig{
				Host:     getEnv("DB_HOST"),
				Port:     getEnv("DB_PORT"),
				User:     getEnv("DB_USER"),
				Password: getEnv("DB_PASSWORD"),
				Name:     getEnv("DB_NAME"),
				SSLMode:  getEnv("DB_SSLMODE"),
			},
			JWT: JWTConfig{
				Secret: getEnv("JWT_SECRET"),
			},
			Cloudinary: CloudinaryConfig{
				CloudName: getEnv("CLOUDINARY_CLOUD_NAME"),
				APIKey:    getEnv("CLOUDINARY_API_KEY"),
				APISecret: getEnv("CLOUDINARY_API_SECRET"),
			},
		}

		validate := validator.New()
		if err := validate.Struct(loaded); err != nil {
			loadErr = fmt.Errorf("invalid configuration: %w", err)
			return
		}

		cfg = loaded
	})

	return cfg, loadErr
}

func MustLoad() *Config {
	loaded, err := Load()
	if err != nil {
		panic(err)
	}

	return loaded
}

func getEnv(key string) string {
	return os.Getenv(key)
}
