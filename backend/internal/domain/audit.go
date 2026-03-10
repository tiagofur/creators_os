package domain

import "github.com/google/uuid"

// ActivityLogEntry represents a single audit event to be recorded.
type ActivityLogEntry struct {
	WorkspaceID uuid.UUID
	UserID      *uuid.UUID
	Action      string         // e.g. "content.created"
	EntityType  string         // e.g. "content"
	EntityID    *uuid.UUID
	Metadata    map[string]any
}
