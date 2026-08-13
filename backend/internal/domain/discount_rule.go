package domain

import "time"

// DiscountRule is an admin-configurable order discount applied on website/POS/backend.
// ScheduleType: always | date_range | weekdays
type DiscountRule struct {
	BaseModel
	Name         string     `gorm:"size:150;not null" json:"name"`
	Active       bool       `gorm:"not null;default:true;index" json:"active"`
	Percent      int        `gorm:"not null" json:"percent"`
	MinSubtotal  int        `gorm:"not null;default:0" json:"min_subtotal"`
	ScheduleType string     `gorm:"size:20;not null;default:'always'" json:"schedule_type"`
	StartDate    *time.Time `json:"start_date,omitempty"`
	EndDate      *time.Time `json:"end_date,omitempty"`
	// WeekdaysJSON is a JSON array of Go weekday ints (0=Sunday … 6=Saturday), e.g. "[5,0]".
	WeekdaysJSON string `gorm:"size:64;not null;default:'[]'" json:"weekdays_json"`
	ExcludeDeals bool   `gorm:"not null;default:true" json:"exclude_deals"`
}
