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
	ID                  uuid.UUID            `json:"id"`
	WorkspaceID         uuid.UUID            `json:"workspace_id"`
	CreatedBy           uuid.UUID            `json:"created_by"`
	Title               string               `json:"title"`
	Description         *string              `json:"description,omitempty"`
	Status              IdeaStatus           `json:"status"`
	PlatformTarget      *PlatformType        `json:"platform_target,omitempty"`
	PromotedToContentID *uuid.UUID           `json:"promoted_to_content_id,omitempty"`
	Metadata            map[string]any       `json:"metadata,omitempty"`
	Tags                []string             `json:"tags"`
	ValidationScore     *IdeaValidationScore `json:"validation_score,omitempty"`
	CreatedAt           time.Time            `json:"created_at"`
	UpdatedAt           time.Time            `json:"updated_at"`
	DeletedAt           *time.Time           `json:"deleted_at,omitempty"`
}

// IdeaValidationScore holds AI-generated scores for an idea.
type IdeaValidationScore struct {
	NoveltyScore     int     `json:"novelty_score"`
	AudienceFitScore int     `json:"audience_fit_score"`
	ViabilityScore   int     `json:"viability_score"`
	UrgencyScore     int     `json:"urgency_score"`
	PersonalFitScore int     `json:"personal_fit_score"`
	OverallScore     int     `json:"overall_score"`
	AIReasoning      *string `json:"ai_reasoning,omitempty"`
}

// IdeaFilter holds optional filtering parameters for listing ideas.
type IdeaFilter struct {
	Status         *IdeaStatus
	CreatedBy      *uuid.UUID
	PlatformTarget *PlatformType
	Limit          int
	Offset         int
}
