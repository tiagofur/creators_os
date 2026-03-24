package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

// approvalService implements ApprovalService.
type approvalService struct {
	approvalRepo repository.ApprovalLinkRepository
	contentRepo  repository.ContentRepository
	logger       *slog.Logger
}

// NewApprovalService creates a new ApprovalService.
func NewApprovalService(
	approvalRepo repository.ApprovalLinkRepository,
	contentRepo repository.ContentRepository,
	logger *slog.Logger,
) ApprovalService {
	if logger == nil {
		logger = slog.Default()
	}
	return &approvalService{
		approvalRepo: approvalRepo,
		contentRepo:  contentRepo,
		logger:       logger,
	}
}

// generateToken creates a crypto-random hex token of 32 bytes (64 hex characters).
func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("approval: generate token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// CreateApprovalLink generates a new approval link for a content item.
func (s *approvalService) CreateApprovalLink(ctx context.Context, contentID, workspaceID uuid.UUID, reviewerName, reviewerEmail string, expiresIn time.Duration) (*domain.ApprovalLink, error) {
	// Verify the content exists
	_, err := s.contentRepo.GetByID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("approval: create link: %w", err)
	}

	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	if expiresIn <= 0 {
		expiresIn = 7 * 24 * time.Hour // default 7 days
	}

	link := &domain.ApprovalLink{
		ContentID:   contentID,
		WorkspaceID: workspaceID,
		Token:       token,
		Status:      "pending",
		ExpiresAt:   time.Now().Add(expiresIn),
	}
	if reviewerName != "" {
		link.ReviewerName = &reviewerName
	}
	if reviewerEmail != "" {
		link.ReviewerEmail = &reviewerEmail
	}

	created, err := s.approvalRepo.Create(ctx, link)
	if err != nil {
		return nil, fmt.Errorf("approval: create link: %w", err)
	}
	return created, nil
}

// GetApprovalByToken retrieves the approval link and its associated content for the public review page.
func (s *approvalService) GetApprovalByToken(ctx context.Context, token string) (*domain.ApprovalLink, *domain.Content, error) {
	link, err := s.approvalRepo.GetByToken(ctx, token)
	if err != nil {
		return nil, nil, fmt.Errorf("approval: get by token: %w", err)
	}

	if time.Now().After(link.ExpiresAt) {
		return nil, nil, domain.NewError("APPROVAL_001", "approval link has expired", 410)
	}

	content, err := s.contentRepo.GetByID(ctx, link.ContentID)
	if err != nil {
		return nil, nil, fmt.Errorf("approval: get content: %w", err)
	}

	return link, content, nil
}

// SubmitDecision records the reviewer's decision on an approval link.
func (s *approvalService) SubmitDecision(ctx context.Context, token string, decision domain.ApprovalDecision) error {
	if decision.Status != "approved" && decision.Status != "rejected" {
		return domain.NewError("APPROVAL_002", "status must be 'approved' or 'rejected'", 400)
	}

	link, err := s.approvalRepo.GetByToken(ctx, token)
	if err != nil {
		return fmt.Errorf("approval: submit decision: %w", err)
	}

	if time.Now().After(link.ExpiresAt) {
		return domain.NewError("APPROVAL_001", "approval link has expired", 410)
	}

	if link.Status != "pending" {
		return domain.NewError("APPROVAL_003", "decision has already been submitted", 409)
	}

	_, err = s.approvalRepo.UpdateDecision(ctx, token, decision.Status, decision.Comment)
	if err != nil {
		return fmt.Errorf("approval: submit decision: %w", err)
	}

	return nil
}

// ListApprovalLinks lists all approval links for a content item.
func (s *approvalService) ListApprovalLinks(ctx context.Context, contentID uuid.UUID) ([]*domain.ApprovalLink, error) {
	links, err := s.approvalRepo.ListByContentID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("approval: list links: %w", err)
	}
	return links, nil
}

// Ensure approvalService implements ApprovalService at compile time.
var _ ApprovalService = (*approvalService)(nil)
