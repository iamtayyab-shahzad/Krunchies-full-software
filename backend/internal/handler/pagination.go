package handler

import (
	"strconv"
	"strings"

	"backend/internal/dto"

	"github.com/gin-gonic/gin"
)

const (
	defaultPageLimit = 50
	maxPageLimit     = 500
)

// parsePage reads ?limit=&offset=. When limit is omitted, paged is false and
// the handler should return the full list (legacy behaviour).
func parsePage(c *gin.Context) (limit, offset int, paged bool) {
	rawLimit := strings.TrimSpace(c.Query("limit"))
	if rawLimit == "" {
		return 0, 0, false
	}
	n, err := strconv.Atoi(rawLimit)
	if err != nil || n < 1 {
		n = defaultPageLimit
	}
	if n > maxPageLimit {
		n = maxPageLimit
	}
	off := 0
	if rawOffset := strings.TrimSpace(c.Query("offset")); rawOffset != "" {
		if v, err := strconv.Atoi(rawOffset); err == nil && v > 0 {
			off = v
		}
	}
	return n, off, true
}

func pageResult[T any](items []T, total int64, limit, offset int) dto.Page[T] {
	if items == nil {
		items = []T{}
	}
	return dto.Page[T]{
		Items:  items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}
}
