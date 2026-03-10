package domain

import (
	"time"

	"github.com/google/uuid"
)

// Series represents a content series (e.g. a recurring show or playlist).
type Series struct {
	ID          uuid.UUID      `json:"id"`
	WorkspaceID uuid.UUID      `json:"workspace_id"`
	CreatedBy   uuid.UUID      `json:"created_by"`
	Title       string         `json:"title"`
	Description *string        `json:"description,omitempty"`
	Platform    *PlatformType  `json:"platform,omitempty"`
	Template    map[string]any `json:"template,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   *time.Time     `json:"deleted_at,omitempty"`
}

// SeriesEpisode links a series to an individual content item at a specific episode number.
type SeriesEpisode struct {
	ID            uuid.UUID     `json:"id"`
	SeriesID      uuid.UUID     `json:"series_id"`
	ContentID     *uuid.UUID    `json:"content_id,omitempty"`
	EpisodeNumber int           `json:"episode_number"`
	Title         string        `json:"title"`
	Status        ContentStatus `json:"status"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// SeriesPublishingSchedule defines the recurring publishing cadence for a series.
type SeriesPublishingSchedule struct {
	ID        uuid.UUID `json:"id"`
	SeriesID  uuid.UUID `json:"series_id"`
	Frequency string    `json:"frequency"` // daily, weekly, biweekly, monthly
	DayOfWeek *int      `json:"day_of_week,omitempty"` // 0=Sunday, 6=Saturday
	TimeOfDay string    `json:"time_of_day"` // HH:MM
	Timezone  string    `json:"timezone"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
