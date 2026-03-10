package domain

import (
	"time"

	"github.com/google/uuid"
)

// PlatformCredential stores encrypted OAuth tokens for a platform connection.
type PlatformCredential struct {
	ID                    uuid.UUID
	WorkspaceID           uuid.UUID
	Platform              PlatformType
	ChannelID             *string
	ChannelName           *string
	EncryptedAccessToken  string
	EncryptedRefreshToken *string
	Scopes                []string
	TokenExpiresAt        *time.Time
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// ScheduledPost represents a piece of content queued for publishing to a platform.
type ScheduledPost struct {
	ID             uuid.UUID
	WorkspaceID    uuid.UUID
	ContentID      uuid.UUID
	CredentialID   *uuid.UUID
	Platform       PlatformType
	Status         string // pending, publishing, published, failed
	ScheduledAt    time.Time
	PublishedAt    *time.Time
	ErrorMessage   *string
	PlatformPostID *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
