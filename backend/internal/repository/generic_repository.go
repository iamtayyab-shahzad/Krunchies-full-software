package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GenericRepository[T any] struct {
	db *gorm.DB
}

func NewGenericRepository[T any](db *gorm.DB) *GenericRepository[T] {
	return &GenericRepository[T]{db: db}
}

func (r *GenericRepository[T]) Create(entity *T) error {
	return r.db.Create(entity).Error
}

func (r *GenericRepository[T]) GetByID(id uuid.UUID) (*T, error) {
	var model T
	if err := r.db.First(&model, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

func (r *GenericRepository[T]) List() ([]T, error) {
	var models []T
	if err := r.db.Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}

func (r *GenericRepository[T]) Update(id uuid.UUID, updates map[string]any) error {
	var model T
	return r.db.Model(&model).Where("id = ?", id).Updates(updates).Error
}

func (r *GenericRepository[T]) Delete(id uuid.UUID) error {
	var model T
	return r.db.Where("id = ?", id).Delete(&model).Error
}
