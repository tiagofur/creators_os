package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

type sponsorshipService struct {
	repo   repository.SponsorshipRepository
	logger *slog.Logger
}

// NewSponsorshipService creates a new SponsorshipService.
func NewSponsorshipService(repo repository.SponsorshipRepository, logger *slog.Logger) SponsorshipService {
	if logger == nil {
		logger = slog.Default()
	}
	return &sponsorshipService{repo: repo, logger: logger}
}

func (s *sponsorshipService) Create(ctx context.Context, workspaceID uuid.UUID, sp *domain.Sponsorship) (*domain.Sponsorship, error) {
	sp.WorkspaceID = workspaceID
	if sp.Status == "" {
		sp.Status = domain.SponsorshipLead
	}
	if sp.Currency == "" {
		sp.Currency = "USD"
	}
	if sp.BrandName == "" {
		return nil, domain.NewError("SPONSORSHIP_001", "brand_name is required", 400)
	}
	created, err := s.repo.Create(ctx, sp)
	if err != nil {
		return nil, fmt.Errorf("sponsorship: create: %w", err)
	}
	return created, nil
}

func (s *sponsorshipService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Sponsorship, error) {
	sp, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("sponsorship: get: %w", err)
	}
	return sp, nil
}

func (s *sponsorshipService) List(ctx context.Context, workspaceID uuid.UUID, filter domain.SponsorshipFilter) ([]*domain.Sponsorship, error) {
	return s.repo.List(ctx, workspaceID, filter)
}

func (s *sponsorshipService) Update(ctx context.Context, sp *domain.Sponsorship) (*domain.Sponsorship, error) {
	existing, err := s.repo.GetByID(ctx, sp.ID)
	if err != nil {
		return nil, fmt.Errorf("sponsorship: update: get: %w", err)
	}
	// Preserve immutable fields.
	sp.WorkspaceID = existing.WorkspaceID
	updated, err := s.repo.Update(ctx, sp)
	if err != nil {
		return nil, fmt.Errorf("sponsorship: update: %w", err)
	}
	return updated, nil
}

func (s *sponsorshipService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("sponsorship: delete: %w", err)
	}
	return nil
}

func (s *sponsorshipService) AddMessage(ctx context.Context, msg *domain.SponsorshipMessage) (*domain.SponsorshipMessage, error) {
	// Verify sponsorship exists.
	if _, err := s.repo.GetByID(ctx, msg.SponsorshipID); err != nil {
		return nil, fmt.Errorf("sponsorship: add message: get sponsorship: %w", err)
	}
	created, err := s.repo.AddMessage(ctx, msg)
	if err != nil {
		return nil, fmt.Errorf("sponsorship: add message: %w", err)
	}
	return created, nil
}

func (s *sponsorshipService) ListMessages(ctx context.Context, sponsorshipID uuid.UUID) ([]*domain.SponsorshipMessage, error) {
	return s.repo.ListMessages(ctx, sponsorshipID)
}

var _ SponsorshipService = (*sponsorshipService)(nil)
