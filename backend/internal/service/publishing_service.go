package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/crypto"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

type publishingService struct {
	repo   repository.PublishingRepository
	aesKey []byte
	logger *slog.Logger
}

// NewPublishingService creates a new PublishingService.
// aesKey must be exactly 32 bytes for AES-256-GCM encryption.
func NewPublishingService(repo repository.PublishingRepository, aesKey []byte, logger *slog.Logger) PublishingService {
	if logger == nil {
		logger = slog.Default()
	}
	return &publishingService{repo: repo, aesKey: aesKey, logger: logger}
}

func (s *publishingService) StoreCredential(
	ctx context.Context,
	workspaceID uuid.UUID,
	platform domain.PlatformType,
	accessToken, refreshToken *string,
	scopes []string,
	expiresAt *time.Time,
) (*domain.PlatformCredential, error) {
	if accessToken == nil || *accessToken == "" {
		return nil, domain.NewError("PUBLISHING_001", "access token is required", 400)
	}

	encAccess, err := crypto.Encrypt(*accessToken, s.aesKey)
	if err != nil {
		return nil, fmt.Errorf("publishing: encrypt access token: %w", err)
	}

	cred := &domain.PlatformCredential{
		WorkspaceID:          workspaceID,
		Platform:             platform,
		EncryptedAccessToken: encAccess,
		Scopes:               scopes,
		TokenExpiresAt:       expiresAt,
	}

	if refreshToken != nil && *refreshToken != "" {
		encRefresh, err := crypto.Encrypt(*refreshToken, s.aesKey)
		if err != nil {
			return nil, fmt.Errorf("publishing: encrypt refresh token: %w", err)
		}
		cred.EncryptedRefreshToken = &encRefresh
	}

	return s.repo.SaveCredential(ctx, cred)
}

func (s *publishingService) GetDecryptedCredential(
	ctx context.Context,
	workspaceID uuid.UUID,
	platform domain.PlatformType,
) (*domain.PlatformCredential, string, string, error) {
	cred, err := s.repo.GetCredential(ctx, workspaceID, platform)
	if err != nil {
		return nil, "", "", err
	}

	accessToken, err := crypto.Decrypt(cred.EncryptedAccessToken, s.aesKey)
	if err != nil {
		return nil, "", "", fmt.Errorf("publishing: decrypt access token: %w", err)
	}

	var refreshToken string
	if cred.EncryptedRefreshToken != nil {
		refreshToken, err = crypto.Decrypt(*cred.EncryptedRefreshToken, s.aesKey)
		if err != nil {
			return nil, "", "", fmt.Errorf("publishing: decrypt refresh token: %w", err)
		}
	}

	return cred, accessToken, refreshToken, nil
}

func (s *publishingService) ListCredentials(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PlatformCredential, error) {
	return s.repo.ListCredentials(ctx, workspaceID)
}

func (s *publishingService) DeleteCredential(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteCredential(ctx, id)
}

func (s *publishingService) SchedulePost(
	ctx context.Context,
	workspaceID, contentID uuid.UUID,
	platform domain.PlatformType,
	scheduledAt time.Time,
) (*domain.ScheduledPost, error) {
	if scheduledAt.Before(time.Now()) {
		return nil, domain.NewError("PUBLISHING_002", "scheduled_at must be in the future", 400)
	}

	post := &domain.ScheduledPost{
		WorkspaceID: workspaceID,
		ContentID:   contentID,
		Platform:    platform,
		Status:      "pending",
		ScheduledAt: scheduledAt,
	}
	return s.repo.CreateScheduledPost(ctx, post)
}

func (s *publishingService) GetCalendar(ctx context.Context, workspaceID uuid.UUID, from, to time.Time) ([]*domain.ScheduledPost, error) {
	return s.repo.ListScheduledPosts(ctx, workspaceID, from, to)
}

func (s *publishingService) CancelScheduledPost(ctx context.Context, id uuid.UUID) error {
	post, err := s.repo.GetScheduledPost(ctx, id)
	if err != nil {
		return err
	}
	if post.Status != "pending" {
		return domain.NewError("PUBLISHING_003", "only pending posts can be cancelled", 400)
	}
	errMsg := "cancelled"
	return s.repo.UpdatePostStatus(ctx, id, "failed", nil, &errMsg)
}

func (s *publishingService) GetOAuthURL(platform domain.PlatformType, state string) string {
	// TODO: implement per-platform OAuth flows in Phase 6
	return fmt.Sprintf("https://oauth.placeholder.example/%s?state=%s", platform, state)
}

var _ PublishingService = (*publishingService)(nil)
