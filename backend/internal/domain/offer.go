package domain

import "time"

type Offer struct {
	BaseModel
	Title       string     `gorm:"size:150;not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Image       string     `gorm:"size:500" json:"image"`
	Active      bool       `gorm:"not null;default:true" json:"active"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}
