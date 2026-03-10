package domain

import (
	"time"

	"github.com/google/uuid"
)

// ConsistencyScore records a user's daily publishing consistency score.
type ConsistencyScore struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	WorkspaceID    uuid.UUID
	Score          int
	PublishedCount int
	StreakDays     int
	RecordedAt     time.Time
}

// Achievement defines a gamification milestone that users can unlock.
type Achievement struct {
	ID          uuid.UUID
	Slug        string
	Name        string
	Description *string
	Icon        *string
	Criteria    map[string]any
	Points      int
}

// UserStats tracks cumulative publishing stats and unlocked achievements for a user.
type UserStats struct {
	ID                   uuid.UUID
	UserID               uuid.UUID
	WorkspaceID          uuid.UUID
	TotalPublished       int
	TotalPoints          int
	AchievementsUnlocked []uuid.UUID
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
