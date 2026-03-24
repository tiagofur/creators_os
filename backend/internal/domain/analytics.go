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

// ConsistencyScore holds a workspace's publishing consistency metrics.
type ConsistencyScore struct {
	Score              int    `json:"score"`
	Streak             int    `json:"streak"`
	LongestStreak      int    `json:"longestStreak"`
	PublishedThisMonth int    `json:"publishedThisMonth"`
	TargetPerMonth     int    `json:"targetPerMonth"`
	Level              string `json:"level"`
}

// HeatmapDay represents publishing activity for a single day.
type HeatmapDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
	Score int    `json:"score"`
}

// PipelineVelocity represents average time spent in each pipeline stage.
type PipelineVelocity struct {
	Stage          string  `json:"stage"`
	AvgDaysInStage float64 `json:"avgDaysInStage"`
	ItemCount      int     `json:"itemCount"`
}

// WeeklyReport holds a summary of activity for a single week.
type WeeklyReport struct {
	WeekStart        string `json:"weekStart"`
	WeekEnd          string `json:"weekEnd"`
	Published        int    `json:"published"`
	IdeasCaptured    int    `json:"ideasCaptured"`
	AICreditsUsed    int    `json:"aiCreditsUsed"`
	TopPlatform      string `json:"topPlatform"`
	ConsistencyScore int    `json:"consistencyScore"`
}

// MonthlyReport holds a summary of activity for a single month.
type MonthlyReport struct {
	MonthStart       string  `json:"monthStart"`
	MonthEnd         string  `json:"monthEnd"`
	Published        int     `json:"published"`
	IdeasCaptured    int     `json:"ideasCaptured"`
	AICreditsUsed    int     `json:"aiCreditsUsed"`
	TopPlatform      string  `json:"topPlatform"`
	ConsistencyScore int     `json:"consistencyScore"`
	TotalIncome      float64 `json:"totalIncome"`
}

// AnalyticsGoal represents a user-defined creator goal.
type AnalyticsGoal struct {
	ID           uuid.UUID `json:"id"`
	WorkspaceID  uuid.UUID `json:"workspaceId"`
	Title        string    `json:"title"`
	MetricType   string    `json:"metricType"`
	TargetValue  int       `json:"targetValue"`
	CurrentValue int       `json:"currentValue"`
	Deadline     *string   `json:"deadline,omitempty"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
}

// PostingTimeSlot represents engagement data for a specific day-of-week and hour combination.
type PostingTimeSlot struct {
	DayOfWeek     int     `json:"day_of_week"` // 0=Sunday, 6=Saturday
	Hour          int     `json:"hour"`         // 0-23
	AvgEngagement float64 `json:"avg_engagement"`
	PostCount     int     `json:"post_count"`
	Confidence    string  `json:"confidence"` // "low", "medium", "high"
}

// BestTimesResponse holds the recommended posting times for a platform.
type BestTimesResponse struct {
	Platform string            `json:"platform"`
	Slots    []PostingTimeSlot `json:"slots"`
	Message  string            `json:"message,omitempty"` // e.g., "Need more data"
}

// CreateGoalInput holds the fields needed to create a new goal.
type CreateGoalInput struct {
	Title       string  `json:"title"`
	MetricType  string  `json:"metricType"`
	TargetValue int     `json:"targetValue"`
	Deadline    *string `json:"deadline,omitempty"`
}

// UpdateGoalInput holds the fields that can be updated on a goal.
type UpdateGoalInput struct {
	Title       *string `json:"title,omitempty"`
	TargetValue *int    `json:"targetValue,omitempty"`
	Deadline    *string `json:"deadline,omitempty"`
	Status      *string `json:"status,omitempty"`
}
