package domain

import (
	"time"

	"github.com/google/uuid"
)

// ContentStatus represents the production lifecycle stage of a piece of content.
type ContentStatus string

const (
	ContentStatusIdea      ContentStatus = "idea"
	ContentStatusScripting ContentStatus = "scripting"
	ContentStatusRecording ContentStatus = "recording"
	ContentStatusEditing   ContentStatus = "editing"
	ContentStatusReview    ContentStatus = "review"
	ContentStatusScheduled ContentStatus = "scheduled"
	ContentStatusPublished ContentStatus = "published"
	ContentStatusArchived  ContentStatus = "archived"
)

// validTransitions defines the allowed state machine transitions for content status.
var validTransitions = map[ContentStatus][]ContentStatus{
	ContentStatusIdea:      {ContentStatusScripting, ContentStatusArchived},
	ContentStatusScripting: {ContentStatusRecording, ContentStatusIdea, ContentStatusArchived},
	ContentStatusRecording: {ContentStatusEditing, ContentStatusScripting, ContentStatusArchived},
	ContentStatusEditing:   {ContentStatusReview, ContentStatusRecording, ContentStatusArchived},
	ContentStatusReview:    {ContentStatusScheduled, ContentStatusEditing, ContentStatusArchived},
	ContentStatusScheduled: {ContentStatusPublished, ContentStatusReview, ContentStatusArchived},
	ContentStatusPublished: {ContentStatusArchived},
	ContentStatusArchived:  {},
}

// ValidateStatusTransition checks whether transitioning from `from` to `to` is permitted.
// Returns a domain AppError if the transition is invalid.
func ValidateStatusTransition(from, to ContentStatus) error {
	allowed, ok := validTransitions[from]
	if !ok {
		return NewError("CONTENT_001", "unknown source status", 400)
	}
	for _, s := range allowed {
		if s == to {
			return nil
		}
	}
	return NewError("CONTENT_002", "invalid status transition", 400)
}

// ContentType categorises content by format.
type ContentType string

const (
	ContentTypeVideo  ContentType = "video"
	ContentTypeShort  ContentType = "short"
	ContentTypeReel   ContentType = "reel"
	ContentTypePost   ContentType = "post"
	ContentTypeThread ContentType = "thread"
)

// Content is the core content aggregate.
type Content struct {
	ID             uuid.UUID
	WorkspaceID    uuid.UUID
	CreatedBy      uuid.UUID
	Title          string
	Description    *string
	Status         ContentStatus
	ContentType    ContentType
	PlatformTarget *PlatformType
	ScheduledAt    *time.Time
	PublishedAt    *time.Time
	DueDate        *time.Time
	Metadata       map[string]any
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
}

// ContentAssignment links a user to a content item with a role.
type ContentAssignment struct {
	ID         uuid.UUID
	ContentID  uuid.UUID
	UserID     uuid.UUID
	Role       string
	AssignedAt time.Time
}

// ContentFilter holds optional filtering parameters for listing content.
type ContentFilter struct {
	Statuses   []ContentStatus
	AssignedTo *uuid.UUID
	Platform   *PlatformType
	GroupBy    string // "status" for kanban
	Limit      int
	Offset     int
}

// KanbanBoard groups content by status column.
type KanbanBoard struct {
	Columns map[string][]*Content `json:"columns"`
}
