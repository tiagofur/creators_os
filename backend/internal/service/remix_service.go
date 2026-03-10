package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/job/tasks"
	"github.com/ordo/creators-os/internal/repository"
)

// remixService implements RemixService.
type remixService struct {
	remixRepo   repository.RemixRepository
	contentRepo repository.ContentRepository
	asynqClient *asynq.Client
	logger      *slog.Logger
}

// NewRemixService creates a new RemixService with the required dependencies.
func NewRemixService(
	remixRepo repository.RemixRepository,
	contentRepo repository.ContentRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) RemixService {
	if logger == nil {
		logger = slog.Default()
	}
	return &remixService{
		remixRepo:   remixRepo,
		contentRepo: contentRepo,
		asynqClient: asynqClient,
		logger:      logger,
	}
}

// SubmitAnalysis creates a DB record and enqueues an async remix analysis task.
func (s *remixService) SubmitAnalysis(ctx context.Context, workspaceID, userID uuid.UUID, inputURL string) (*domain.RemixJob, error) {
	job := &domain.RemixJob{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Status:      "pending",
		InputURL:    inputURL,
		Results:     make(map[string]any),
	}

	created, err := s.remixRepo.Create(ctx, job)
	if err != nil {
		return nil, fmt.Errorf("remix_service: create job: %w", err)
	}

	task, err := tasks.NewRemixAnalysisTask(
		created.ID.String(),
		workspaceID.String(),
		userID.String(),
		inputURL,
	)
	if err != nil {
		return nil, fmt.Errorf("remix_service: create task: %w", err)
	}

	if _, err := s.asynqClient.EnqueueContext(ctx, task); err != nil {
		s.logger.WarnContext(ctx, "failed to enqueue remix analysis task",
			"job_id", created.ID,
			"err", err,
		)
	}

	return created, nil
}

// GetJobStatus returns the current status of a remix job.
func (s *remixService) GetJobStatus(ctx context.Context, jobID uuid.UUID) (*domain.RemixJob, error) {
	job, err := s.remixRepo.GetByID(ctx, jobID)
	if err != nil {
		return nil, fmt.Errorf("remix_service: get job: %w", err)
	}
	return job, nil
}

// GetJobResults returns the results of a completed remix job.
// Returns 404 if the job is not complete.
func (s *remixService) GetJobResults(ctx context.Context, jobID uuid.UUID) (map[string]any, error) {
	job, err := s.remixRepo.GetByID(ctx, jobID)
	if err != nil {
		return nil, fmt.Errorf("remix_service: get job: %w", err)
	}

	if job.Status != "complete" {
		return nil, domain.NewError("REMIX_001", "remix job is not yet complete", 404)
	}

	return job.Results, nil
}

// ApplyResults creates Content records for each selected clip ID.
func (s *remixService) ApplyResults(ctx context.Context, jobID uuid.UUID, clipIDs []string) ([]*domain.Content, error) {
	job, err := s.remixRepo.GetByID(ctx, jobID)
	if err != nil {
		return nil, fmt.Errorf("remix_service: get job for apply: %w", err)
	}

	if job.Status != "complete" {
		return nil, domain.NewError("REMIX_001", "remix job is not yet complete", 422)
	}

	// Extract clips from results
	clips, ok := job.Results["clips"].([]any)
	if !ok {
		return nil, domain.NewError("REMIX_002", "no clips found in job results", 422)
	}

	// Build a lookup map for requested clip IDs
	clipIDSet := make(map[string]bool, len(clipIDs))
	for _, id := range clipIDs {
		clipIDSet[id] = true
	}

	var created []*domain.Content
	for _, c := range clips {
		clip, ok := c.(map[string]any)
		if !ok {
			continue
		}
		clipID, _ := clip["id"].(string)
		if len(clipIDs) > 0 && !clipIDSet[clipID] {
			continue
		}

		title, _ := clip["title"].(string)
		if title == "" {
			title = "Remix Clip"
		}
		desc, _ := clip["description"].(string)

		content := &domain.Content{
			WorkspaceID: job.WorkspaceID,
			CreatedBy:   job.UserID,
			Title:       title,
			Status:      domain.ContentStatusIdea,
			ContentType: domain.ContentTypeShort,
			Metadata:    clip,
		}
		if desc != "" {
			content.Description = &desc
		}

		saved, err := s.contentRepo.Create(ctx, content)
		if err != nil {
			s.logger.WarnContext(ctx, "failed to create content for clip",
				"clip_id", clipID,
				"err", err,
			)
			continue
		}
		created = append(created, saved)
	}

	return created, nil
}

// Ensure remixService implements RemixService at compile time.
var _ RemixService = (*remixService)(nil)
