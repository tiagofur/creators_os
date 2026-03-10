package domain

import (
	"time"

	"github.com/google/uuid"
)

// IdeaStatus represents the lifecycle state of an idea.
type IdeaStatus string

const (
	IdeaStatusDraft      IdeaStatus = "draft"
	IdeaStatusValidating IdeaStatus = "validating"
	IdeaStatusValidated  IdeaStatus = "validated"
	IdeaStatusPromoted   IdeaStatus = "promoted"
	IdeaStatusArchived   IdeaStatus = "archived"
)

// PlatformType represents a social/content platform.
type PlatformType string

const (
	PlatformYouTube   PlatformType = "youtube"
	PlatformTikTok    PlatformType = "tiktok"
	PlatformInstagram PlatformType = "instagram"
	PlatformTwitter   PlatformType = "twitter"
	PlatformLinkedIn  PlatformType = "linkedin"
)

// Idea represents a content idea in its lifecycle.
type Idea struct {
	ID                  uuid.UUID
	WorkspaceID         uuid.UUID
	CreatedBy           uuid.UUID
	Title               string
	Description         *string
	Status              IdeaStatus
	PlatformTarget      *PlatformType
	PromotedToContentID *uuid.UUID
	Metadata            map[string]any
	Tags                []string
	ValidationScore     *IdeaValidationScore
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DeletedAt           *time.Time
}

// IdeaValidationScore holds AI-generated scores for an idea.
type IdeaValidationScore struct {
	NoveltyScore     int
	AudienceFitScore int
	ViabilityScore   int
	UrgencyScore     int
	PersonalFitScore int
	OverallScore     int
	AIReasoning      *string
}

// IdeaFilter holds optional filtering parameters for listing ideas.
type IdeaFilter struct {
	Status         *IdeaStatus
	CreatedBy      *uuid.UUID
	PlatformTarget *PlatformType
	Limit          int
	Offset         int
}
