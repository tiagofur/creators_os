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

// contentService implements ContentService.
type contentService struct {
	contentRepo repository.ContentRepository
	asynqClient *asynq.Client
	logger      *slog.Logger
}

// NewContentService creates a new ContentService.
func NewContentService(
	contentRepo repository.ContentRepository,
	asynqClient *asynq.Client,
	logger *slog.Logger,
) ContentService {
	if logger == nil {
		logger = slog.Default()
	}
	return &contentService{
		contentRepo: contentRepo,
		asynqClient: asynqClient,
		logger:      logger,
	}
}

// Create creates a new content item in the given workspace.
func (s *contentService) Create(ctx context.Context, workspaceID, createdBy uuid.UUID, title string, description *string, contentType domain.ContentType, platformTarget *domain.PlatformType) (*domain.Content, error) {
	if contentType == "" {
		contentType = domain.ContentTypeVideo
	}

	content := &domain.Content{
		WorkspaceID:    workspaceID,
		CreatedBy:      createdBy,
		Title:          title,
		Description:    description,
		Status:         domain.ContentStatusIdea,
		ContentType:    contentType,
		PlatformTarget: platformTarget,
		Metadata:       map[string]any{},
	}

	created, err := s.contentRepo.Create(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("content: create: %w", err)
	}
	return created, nil
}

// GetByID retrieves a content item by ID.
func (s *contentService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Content, error) {
	content, err := s.contentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content: get: %w", err)
	}
	return content, nil
}

// List returns content items in a workspace with optional filtering.
func (s *contentService) List(ctx context.Context, workspaceID uuid.UUID, filter domain.ContentFilter) ([]*domain.Content, error) {
	contents, err := s.contentRepo.List(ctx, workspaceID, filter)
	if err != nil {
		return nil, fmt.Errorf("content: list: %w", err)
	}
	return contents, nil
}

// Update updates mutable fields of a content item.
func (s *contentService) Update(ctx context.Context, id uuid.UUID, title *string, description *string, platformTarget *domain.PlatformType, dueDate *string, scheduledAt *string) (*domain.Content, error) {
	content, err := s.contentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content: update: get: %w", err)
	}

	if title != nil {
		content.Title = *title
	}
	if description != nil {
		content.Description = description
	}
	if platformTarget != nil {
		content.PlatformTarget = platformTarget
	}

	updated, err := s.contentRepo.Update(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("content: update: %w", err)
	}
	return updated, nil
}

// Delete soft-deletes a content item.
func (s *contentService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.contentRepo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("content: delete: %w", err)
	}
	return nil
}

// TransitionStatus validates and applies a content status transition.
func (s *contentService) TransitionStatus(ctx context.Context, contentID uuid.UUID, to domain.ContentStatus) error {
	content, err := s.contentRepo.GetByID(ctx, contentID)
	if err != nil {
		return fmt.Errorf("content: transition status: get: %w", err)
	}

	if err := domain.ValidateStatusTransition(content.Status, to); err != nil {
		return err
	}

	if err := s.contentRepo.UpdateStatus(ctx, contentID, to); err != nil {
		return fmt.Errorf("content: transition status: update: %w", err)
	}

	// Notify assignees if any
	assignments, err := s.contentRepo.ListAssignments(ctx, contentID)
	if err != nil {
		s.logger.WarnContext(ctx, "failed to list assignments for notification", "content_id", contentID, "err", err)
		return nil
	}

	for _, a := range assignments {
		task, taskErr := tasks.NewAssignmentNotificationTask(contentID.String(), a.UserID.String(), a.Role)
		if taskErr != nil {
			s.logger.WarnContext(ctx, "failed to create notification task", "content_id", contentID, "user_id", a.UserID, "err", taskErr)
			continue
		}
		if _, err := s.asynqClient.EnqueueContext(ctx, task); err != nil {
			s.logger.WarnContext(ctx, "failed to enqueue assignment notification", "content_id", contentID, "user_id", a.UserID, "err", err)
		}
	}

	return nil
}

// AddAssignment adds a user assignment to a content item.
func (s *contentService) AddAssignment(ctx context.Context, contentID, userID uuid.UUID, role string) (*domain.ContentAssignment, error) {
	if role == "" {
		role = "assignee"
	}

	assignment := &domain.ContentAssignment{
		ContentID: contentID,
		UserID:    userID,
		Role:      role,
	}

	created, err := s.contentRepo.AddAssignment(ctx, assignment)
	if err != nil {
		return nil, fmt.Errorf("content: add assignment: %w", err)
	}

	// Enqueue notification
	task, taskErr := tasks.NewAssignmentNotificationTask(contentID.String(), userID.String(), role)
	if taskErr == nil {
		if _, enqErr := s.asynqClient.EnqueueContext(ctx, task); enqErr != nil {
			s.logger.WarnContext(ctx, "failed to enqueue assignment notification", "content_id", contentID, "user_id", userID, "err", enqErr)
		}
	}

	return created, nil
}

// RemoveAssignment removes a user assignment from a content item.
func (s *contentService) RemoveAssignment(ctx context.Context, contentID, userID uuid.UUID) error {
	if err := s.contentRepo.RemoveAssignment(ctx, contentID, userID); err != nil {
		return fmt.Errorf("content: remove assignment: %w", err)
	}
	return nil
}

// Ensure contentService implements ContentService at compile time.
var _ ContentService = (*contentService)(nil)
