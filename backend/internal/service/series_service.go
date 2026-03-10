package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

// seriesService implements SeriesService.
type seriesService struct {
	seriesRepo repository.SeriesRepository
	logger     *slog.Logger
}

// NewSeriesService creates a new SeriesService.
func NewSeriesService(
	seriesRepo repository.SeriesRepository,
	logger *slog.Logger,
) SeriesService {
	if logger == nil {
		logger = slog.Default()
	}
	return &seriesService{
		seriesRepo: seriesRepo,
		logger:     logger,
	}
}

// Create creates a new series in the given workspace.
func (s *seriesService) Create(ctx context.Context, workspaceID, createdBy uuid.UUID, title string, description *string, platform *domain.PlatformType) (*domain.Series, error) {
	series := &domain.Series{
		WorkspaceID: workspaceID,
		CreatedBy:   createdBy,
		Title:       title,
		Description: description,
		Platform:    platform,
		Template:    map[string]any{},
	}

	created, err := s.seriesRepo.Create(ctx, series)
	if err != nil {
		return nil, fmt.Errorf("series: create: %w", err)
	}
	return created, nil
}

// GetByID retrieves a series by ID.
func (s *seriesService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Series, error) {
	series, err := s.seriesRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("series: get: %w", err)
	}
	return series, nil
}

// List returns series in a workspace.
func (s *seriesService) List(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.Series, error) {
	series, err := s.seriesRepo.List(ctx, workspaceID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("series: list: %w", err)
	}
	return series, nil
}

// Update updates a series' mutable fields.
func (s *seriesService) Update(ctx context.Context, id uuid.UUID, title *string, description *string, platform *domain.PlatformType) (*domain.Series, error) {
	series, err := s.seriesRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("series: update: get: %w", err)
	}

	if title != nil {
		series.Title = *title
	}
	if description != nil {
		series.Description = description
	}
	if platform != nil {
		series.Platform = platform
	}

	updated, err := s.seriesRepo.Update(ctx, series)
	if err != nil {
		return nil, fmt.Errorf("series: update: %w", err)
	}
	return updated, nil
}

// Delete soft-deletes a series.
func (s *seriesService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.seriesRepo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("series: delete: %w", err)
	}
	return nil
}

// AddEpisode adds an episode to a series.
func (s *seriesService) AddEpisode(ctx context.Context, seriesID uuid.UUID, contentID *uuid.UUID, episodeNumber int, title string) (*domain.SeriesEpisode, error) {
	ep := &domain.SeriesEpisode{
		SeriesID:      seriesID,
		ContentID:     contentID,
		EpisodeNumber: episodeNumber,
		Title:         title,
		Status:        domain.ContentStatusIdea,
	}

	created, err := s.seriesRepo.AddEpisode(ctx, ep)
	if err != nil {
		return nil, fmt.Errorf("series: add episode: %w", err)
	}
	return created, nil
}

// UpdateEpisode updates an episode.
func (s *seriesService) UpdateEpisode(ctx context.Context, id uuid.UUID, title *string, status *domain.ContentStatus, contentID *uuid.UUID) (*domain.SeriesEpisode, error) {
	ep, err := s.seriesRepo.GetEpisode(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("series: update episode: get: %w", err)
	}

	if title != nil {
		ep.Title = *title
	}
	if status != nil {
		ep.Status = *status
	}
	if contentID != nil {
		ep.ContentID = contentID
	}

	updated, err := s.seriesRepo.UpdateEpisode(ctx, ep)
	if err != nil {
		return nil, fmt.Errorf("series: update episode: %w", err)
	}
	return updated, nil
}

// DeleteEpisode deletes an episode.
func (s *seriesService) DeleteEpisode(ctx context.Context, id uuid.UUID) error {
	if err := s.seriesRepo.DeleteEpisode(ctx, id); err != nil {
		return fmt.Errorf("series: delete episode: %w", err)
	}
	return nil
}

// UpsertSchedule creates or updates the publishing schedule for a series.
func (s *seriesService) UpsertSchedule(ctx context.Context, schedule *domain.SeriesPublishingSchedule) (*domain.SeriesPublishingSchedule, error) {
	result, err := s.seriesRepo.UpsertSchedule(ctx, schedule)
	if err != nil {
		return nil, fmt.Errorf("series: upsert schedule: %w", err)
	}
	return result, nil
}

// Ensure seriesService implements SeriesService at compile time.
var _ SeriesService = (*seriesService)(nil)
