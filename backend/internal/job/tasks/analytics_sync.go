package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

const TypeAnalyticsSync = "analytics:sync"

// AnalyticsSyncPayload holds the data for an analytics sync task.
type AnalyticsSyncPayload struct {
	WorkspaceID string `json:"workspace_id"`
}

// NewAnalyticsSyncTask creates an asynq task for syncing analytics for a workspace.
func NewAnalyticsSyncTask(workspaceID string) (*asynq.Task, error) {
	payload, err := json.Marshal(AnalyticsSyncPayload{WorkspaceID: workspaceID})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal analytics sync payload: %w", err)
	}
	return asynq.NewTask(TypeAnalyticsSync, payload, asynq.Queue("low"), asynq.MaxRetry(3)), nil
}

// NewAnalyticsSyncHandler returns a HandleAnalyticsSyncTask bound to the provided pool.
func NewAnalyticsSyncHandler(pool *pgxpool.Pool) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		return HandleAnalyticsSyncTask(ctx, t, pool)
	}
}

// HandleAnalyticsSyncTask processes an analytics:sync task.
// Stub implementation: logs the sync and inserts a dummy analytics row.
// Real platform API calls are Phase 6 work.
func HandleAnalyticsSyncTask(ctx context.Context, t *asynq.Task, pool *pgxpool.Pool) error {
	var p AnalyticsSyncPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal analytics sync payload: %w", err)
	}

	workspaceID, err := uuid.Parse(p.WorkspaceID)
	if err != nil {
		return fmt.Errorf("tasks: invalid workspace_id %q: %w", p.WorkspaceID, err)
	}

	slog.InfoContext(ctx, "syncing analytics for workspace", "workspace_id", workspaceID)

	// Stub: insert a dummy analytics row for YouTube to indicate the sync ran.
	repo := repository.NewAnalyticsRepository(pool)
	dummy := &domain.PlatformAnalytics{
		WorkspaceID:     workspaceID,
		Platform:        domain.PlatformYouTube,
		FollowersCount:  0,
		TotalViews:      0,
		TotalEngagement: 0,
		RecordedAt:      time.Now().UTC(),
	}
	if err := repo.SavePlatformAnalytics(ctx, dummy); err != nil {
		return fmt.Errorf("tasks: save dummy analytics: %w", err)
	}

	return nil
}
