package ws

import (
	"time"

	"github.com/google/uuid"
)

// Event is the wire format for all WebSocket messages sent to clients.
type Event struct {
	Event       string         `json:"event"`
	WorkspaceID uuid.UUID      `json:"workspace_id"`
	Payload     map[string]any `json:"payload"`
	Timestamp   time.Time      `json:"timestamp"`
}

// Event type constants.
const (
	EventContentStatusChanged = "content.status_changed"
	EventRemixJobComplete     = "remix.job_complete"
	EventAchievementUnlocked  = "achievement.unlocked"
)
