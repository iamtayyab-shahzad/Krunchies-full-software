package domain

type Customer struct {
	BaseModel
	Name  string `gorm:"size:100;not null" json:"name"`
	Phone string `gorm:"size:20;not null;uniqueIndex" json:"phone"`
}
