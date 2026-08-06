package notify

import (
	"testing"

	"github.com/google/uuid"
)

func TestNotifyNewOrderAsync_NoEnvNoPanic(t *testing.T) {
	// Unset is default in tests; must not panic or hang the caller.
	NotifyNewOrderAsync(uuid.New(), 1500)
	notifyNewOrder(uuid.New(), 1500)
}
