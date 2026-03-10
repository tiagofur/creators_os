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

// ideaService implements IdeaService.
type ideaService struct {
	ideaRepo    repository.IdeaRepository
	contentRepo repository.ContentRepository
	asynqClient *asynq.Client
	logger      *slog.Logger
}

// NewIdeaService creates a new IdeaService.
func NewIdeaService(
	ideaRepo repository.IdeaRepository,
	contentRepo repository.ContentRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) IdeaService {
	if logger == nil {
		logger = slog.Default()
	}
	return &ideaService{
		ideaRepo:    ideaRepo,
		contentRepo: contentRepo,
		asynqClient: asynqClient,
		logger:      logger,
	}
}

// Create creates a new idea in the given workspace.
func (s *ideaService) Create(ctx context.Context, workspaceID, createdBy uuid.UUID, title string, description *string, platformTarget *domain.PlatformType) (*domain.Idea, error) {
	idea := &domain.Idea{
		WorkspaceID:    workspaceID,
		CreatedBy:      createdBy,
		Title:          title,
		Description:    description,
		Status:         domain.IdeaStatusDraft,
		PlatformTarget: platformTarget,
		Metadata:       map[string]any{},
	}

	created, err := s.ideaRepo.Create(ctx, idea)
	if err != nil {
		return nil, fmt.Errorf("idea: create: %w", err)
	}
	return created, nil
}

// GetByID retrieves an idea by ID.
func (s *ideaService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error) {
	idea, err := s.ideaRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("idea: get: %w", err)
	}
	return idea, nil
}

// List returns ideas in a workspace with optional filtering.
func (s *ideaService) List(ctx context.Context, workspaceID uuid.UUID, filter domain.IdeaFilter) ([]*domain.Idea, error) {
	ideas, err := s.ideaRepo.List(ctx, workspaceID, filter)
	if err != nil {
		return nil, fmt.Errorf("idea: list: %w", err)
	}
	return ideas, nil
}

// Update updates the title and/or description of an idea.
func (s *ideaService) Update(ctx context.Context, id uuid.UUID, title *string, description *string) (*domain.Idea, error) {
	idea, err := s.ideaRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("idea: update: get: %w", err)
	}

	if title != nil {
		idea.Title = *title
	}
	if description != nil {
		idea.Description = description
	}

	updated, err := s.ideaRepo.Update(ctx, idea)
	if err != nil {
		return nil, fmt.Errorf("idea: update: %w", err)
	}
	return updated, nil
}

// Delete soft-deletes an idea.
func (s *ideaService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.ideaRepo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("idea: delete: %w", err)
	}
	return nil
}

// RequestValidation enqueues an AI validation task and transitions status to validating.
func (s *ideaService) RequestValidation(ctx context.Context, id uuid.UUID) error {
	idea, err := s.ideaRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("idea: request validation: get: %w", err)
	}

	if idea.Status != domain.IdeaStatusDraft {
		return domain.NewError("IDEA_001", "idea must be in draft status to request validation", 400)
	}

	task, taskErr := tasks.NewIdeaValidationTask(id.String(), idea.WorkspaceID.String())
	if taskErr != nil {
		return fmt.Errorf("idea: request validation: create task: %w", taskErr)
	}

	if _, err := s.asynqClient.EnqueueContext(ctx, task); err != nil {
		s.logger.WarnContext(ctx, "failed to enqueue idea validation task", "idea_id", id, "err", err)
		return fmt.Errorf("idea: request validation: enqueue: %w", err)
	}

	if err := s.ideaRepo.UpdateStatus(ctx, id, domain.IdeaStatusValidating); err != nil {
		return fmt.Errorf("idea: request validation: update status: %w", err)
	}

	return nil
}

// SetTags sets tags for an idea and returns the updated idea.
func (s *ideaService) SetTags(ctx context.Context, id uuid.UUID, tags []string) (*domain.Idea, error) {
	if err := s.ideaRepo.SetTags(ctx, id, tags); err != nil {
		return nil, fmt.Errorf("idea: set tags: %w", err)
	}

	idea, err := s.ideaRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("idea: set tags: get updated: %w", err)
	}
	return idea, nil
}

// Promote promotes an idea to a content record.
func (s *ideaService) Promote(ctx context.Context, ideaID uuid.UUID) (*domain.Content, error) {
	idea, err := s.ideaRepo.GetByID(ctx, ideaID)
	if err != nil {
		return nil, fmt.Errorf("idea: promote: get idea: %w", err)
	}

	content := &domain.Content{
		WorkspaceID: idea.WorkspaceID,
		CreatedBy:   idea.CreatedBy,
		Title:       idea.Title,
		Description: idea.Description,
		Status:      domain.ContentStatusIdea,
		ContentType: domain.ContentTypeVideo,
		Metadata:    map[string]any{},
	}
	if idea.PlatformTarget != nil {
		content.PlatformTarget = idea.PlatformTarget
	}

	created, err := s.contentRepo.Create(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("idea: promote: create content: %w", err)
	}

	if err := s.ideaRepo.Promote(ctx, ideaID, created.ID); err != nil {
		return nil, fmt.Errorf("idea: promote: update idea: %w", err)
	}

	return created, nil
}

// Ensure ideaService implements IdeaService at compile time.
var _ IdeaService = (*ideaService)(nil)
