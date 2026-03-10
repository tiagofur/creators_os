package domain

import (
	"time"

	"github.com/google/uuid"
)

// PlatformAnalytics holds aggregated metrics for a workspace/platform snapshot.
type PlatformAnalytics struct {
	ID              uuid.UUID
	WorkspaceID     uuid.UUID
	Platform        PlatformType
	FollowersCount  int64
	TotalViews      int64
	TotalEngagement int64
	RecordedAt      time.Time
}

// ContentAnalyticsSummary holds per-content analytics for a reporting period.
type ContentAnalyticsSummary struct {
	ContentID   uuid.UUID
	Platform    PlatformType
	TotalViews  int64
	TotalLikes  int64
	TotalShares int64
	Period      string
}

// AnalyticsOverview aggregates metrics across all platforms for a workspace.
type AnalyticsOverview struct {
	TotalFollowers  int64
	TotalViews      int64
	TotalEngagement int64
	ByPlatform      map[string]*PlatformAnalytics
}
