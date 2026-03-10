package domain

import (
	"time"

	"github.com/google/uuid"
)

// Series represents a content series (e.g. a recurring show or playlist).
type Series struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	CreatedBy   uuid.UUID
	Title       string
	Description *string
	Platform    *PlatformType
	Template    map[string]any
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   *time.Time
}

// SeriesEpisode links a series to an individual content item at a specific episode number.
type SeriesEpisode struct {
	ID            uuid.UUID
	SeriesID      uuid.UUID
	ContentID     *uuid.UUID
	EpisodeNumber int
	Title         string
	Status        ContentStatus
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// SeriesPublishingSchedule defines the recurring publishing cadence for a series.
type SeriesPublishingSchedule struct {
	ID        uuid.UUID
	SeriesID  uuid.UUID
	Frequency string // daily, weekly, biweekly, monthly
	DayOfWeek *int   // 0=Sunday, 6=Saturday
	TimeOfDay string // HH:MM
	Timezone  string
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}
