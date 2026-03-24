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

func (s *analyticsService) GetConsistencyScore(ctx context.Context, workspaceID uuid.UUID) (*domain.ConsistencyScore, error) {
	return s.repo.GetConsistencyScore(ctx, workspaceID)
}

func (s *analyticsService) GetHeatmap(ctx context.Context, workspaceID uuid.UUID, year int) ([]*domain.HeatmapDay, error) {
	return s.repo.GetHeatmap(ctx, workspaceID, year)
}

func (s *analyticsService) GetPipelineVelocity(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PipelineVelocity, error) {
	return s.repo.GetPipelineVelocity(ctx, workspaceID)
}

func (s *analyticsService) GetWeeklyReport(ctx context.Context, workspaceID uuid.UUID) (*domain.WeeklyReport, error) {
	return s.repo.GetWeeklyReport(ctx, workspaceID)
}

func (s *analyticsService) GetMonthlyReport(ctx context.Context, workspaceID uuid.UUID) (*domain.MonthlyReport, error) {
	return s.repo.GetMonthlyReport(ctx, workspaceID)
}

func (s *analyticsService) ListGoals(ctx context.Context, workspaceID uuid.UUID) ([]*domain.AnalyticsGoal, error) {
	return s.repo.ListGoals(ctx, workspaceID)
}

func (s *analyticsService) CreateGoal(ctx context.Context, workspaceID uuid.UUID, input domain.CreateGoalInput) (*domain.AnalyticsGoal, error) {
	goal := &domain.AnalyticsGoal{
		ID:          uuid.New(),
		WorkspaceID: workspaceID,
		Title:       input.Title,
		MetricType:  input.MetricType,
		TargetValue: input.TargetValue,
		Deadline:    input.Deadline,
		Status:      "active",
	}
	return s.repo.CreateGoal(ctx, goal)
}

func (s *analyticsService) UpdateGoal(ctx context.Context, goalID uuid.UUID, input domain.UpdateGoalInput) (*domain.AnalyticsGoal, error) {
	return s.repo.UpdateGoal(ctx, goalID, input)
}

func (s *analyticsService) DeleteGoal(ctx context.Context, goalID uuid.UUID) error {
	return s.repo.DeleteGoal(ctx, goalID)
}

var _ AnalyticsService = (*analyticsService)(nil)
