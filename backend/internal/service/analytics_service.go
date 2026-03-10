package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

const typeAnalyticsSync = "analytics:sync"

type analyticsSyncPayload struct {
	WorkspaceID string `json:"workspace_id"`
}

type analyticsService struct {
	repo        repository.AnalyticsRepository
	asynqClient *asynq.Client
	logger      *slog.Logger
}

// NewAnalyticsService creates a new AnalyticsService.
func NewAnalyticsService(repo repository.AnalyticsRepository, asynqClient *asynq.Client, logger *slog.Logger) AnalyticsService {
	if logger == nil {
		logger = slog.Default()
	}
	return &analyticsService{repo: repo, asynqClient: asynqClient, logger: logger}
}

func (s *analyticsService) GetOverview(ctx context.Context, workspaceID uuid.UUID) (*domain.AnalyticsOverview, error) {
	return s.repo.GetOverview(ctx, workspaceID)
}

func (s *analyticsService) GetContentAnalytics(ctx context.Context, contentID uuid.UUID, from, to time.Time) ([]*domain.ContentAnalyticsSummary, error) {
	return s.repo.GetContentAnalytics(ctx, contentID, from, to)
}

func (s *analyticsService) GetPlatformAnalytics(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType, limit int) ([]*domain.PlatformAnalytics, error) {
	if limit <= 0 {
		limit = 30
	}
	return s.repo.GetPlatformAnalytics(ctx, workspaceID, platform, limit)
}

func (s *analyticsService) TriggerSync(ctx context.Context, workspaceID uuid.UUID) error {
	payload, err := json.Marshal(analyticsSyncPayload{WorkspaceID: workspaceID.String()})
	if err != nil {
		return fmt.Errorf("analytics: marshal sync payload: %w", err)
	}

	task := asynq.NewTask(typeAnalyticsSync, payload, asynq.Queue("low"), asynq.MaxRetry(3))
	if _, err := s.asynqClient.EnqueueContext(ctx, task); err != nil {
		return fmt.Errorf("analytics: enqueue sync task: %w", err)
	}
	return nil
}

var _ AnalyticsService = (*analyticsService)(nil)
