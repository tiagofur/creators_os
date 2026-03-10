package domain

import (
	"time"

	"github.com/google/uuid"
)

// RemixJob represents an async remix analysis job.
type RemixJob struct {
	ID           uuid.UUID
	WorkspaceID  uuid.UUID
	UserID       uuid.UUID
	Status       string // pending, ingesting, transcribing, scoring, generating, complete, failed
	InputURL     string
	Results      map[string]any
	ErrorMessage *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
