package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/job/tasks"
	"github.com/ordo/creators-os/internal/repository"
)

// errInvalidCredentials is the single error returned for any auth failure
// to prevent user enumeration.
var errInvalidCredentials = domain.NewError("AUTH_001", "invalid credentials", 401)

// authService implements AuthService.
type authService struct {
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
	jwtManager  *auth.JWTManager
	asynqClient *asynq.Client
	oauthMgr    *auth.OAuthManager
	logger      *slog.Logger
}

// NewAuthService creates a new AuthService with the required dependencies.
// logger and oauthMgr may be nil; defaults will be used.
func NewAuthService(
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	jwtManager *auth.JWTManager,
	asynqClient *asynq.Client,
	oauthMgr *auth.OAuthManager,
	logger *slog.Logger,
) AuthService {
	if logger == nil {
		logger = slog.Default()
	}
	return &authService{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		jwtManager:  jwtManager,
		asynqClient: asynqClient,
		oauthMgr:    oauthMgr,
		logger:      logger,
	}
}

// Register creates a new user, enqueues a verification email, and returns tokens.
func (s *authService) Register(ctx context.Context, email, password, fullName string) (*domain.AuthTokens, error) {
	// Check for existing user
	existing, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, fmt.Errorf("auth: register: check email: %w", err)
	}
	if existing != nil {
		return nil, domain.NewError("AUTH_005", "email already registered", 409)
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("auth: register: hash password: %w", err)
	}

	user := &domain.User{
		Email:            email,
		PasswordHash:     &passwordHash,
		FullName:         fullName,
		SubscriptionTier: domain.TierFree,
		AICreditsBalance: 50,
	}

	created, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("auth: register: create user: %w", err)
	}

	// Generate and store email verification token
	verifyToken, err := generateSecureToken()
	if err != nil {
		s.logger.WarnContext(ctx, "failed to generate verification token", "err", err)
	} else {
		expiresAt := time.Now().Add(24 * time.Hour)
		if err := s.userRepo.UpdateEmailVerification(ctx, created.ID, verifyToken, expiresAt); err != nil {
			s.logger.WarnContext(ctx, "failed to store verification token", "err", err)
		} else {
			task, taskErr := tasks.NewEmailVerificationTask(created.ID.String(), created.Email, verifyToken)
			if taskErr == nil {
				if _, enqErr := s.asynqClient.EnqueueContext(ctx, task); enqErr != nil {
					s.logger.WarnContext(ctx, "failed to enqueue verification email", "err", enqErr)
				}
			}
		}
	}

	return s.issueTokens(ctx, created)
}

// Login verifies credentials and returns new tokens.
// Wrong email and wrong password both return the same error (no enumeration).
func (s *authService) Login(ctx context.Context, email, password string) (*domain.AuthTokens, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, errInvalidCredentials
		}
		return nil, fmt.Errorf("auth: login: get user: %w", err)
	}

	if user.PasswordHash == nil || !auth.CheckPassword(password, *user.PasswordHash) {
		return nil, errInvalidCredentials
	}

	return s.issueTokens(ctx, user)
}

// RefreshTokens validates a refresh token, revokes it, and issues a new pair.
func (s *authService) RefreshTokens(ctx context.Context, refreshToken string) (*domain.AuthTokens, error) {
	hash := s.jwtManager.TokenHash(refreshToken)

	session, err := s.sessionRepo.GetByTokenHash(ctx, hash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrUnauthorized
		}
		return nil, fmt.Errorf("auth: refresh: get session: %w", err)
	}

	if session.RevokedAt != nil {
		return nil, domain.ErrUnauthorized
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, domain.ErrTokenExpired
	}

	// Revoke old session
	if err := s.sessionRepo.Revoke(ctx, hash); err != nil {
		return nil, fmt.Errorf("auth: refresh: revoke session: %w", err)
	}

	// Look up user to get current claims
	user, err := s.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, fmt.Errorf("auth: refresh: get user: %w", err)
	}

	return s.issueTokens(ctx, user)
}

// Logout revokes the session associated with the given refresh token.
func (s *authService) Logout(ctx context.Context, refreshToken string) error {
	hash := s.jwtManager.TokenHash(refreshToken)
	return s.sessionRepo.Revoke(ctx, hash)
}

// LogoutAll revokes all active sessions for the given user.
func (s *authService) LogoutAll(ctx context.Context, userID uuid.UUID) error {
	return s.sessionRepo.RevokeAll(ctx, userID)
}

// ForgotPassword generates a password reset token and enqueues a reset email.
// Always returns nil to prevent email enumeration.
func (s *authService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Do not reveal whether email exists
		return nil
	}

	resetToken, err := generateSecureToken()
	if err != nil {
		s.logger.WarnContext(ctx, "failed to generate reset token", "err", err)
		return nil
	}

	tokenHash := s.jwtManager.TokenHash(resetToken)
	expiresAt := time.Now().Add(24 * time.Hour)

	if err := s.userRepo.UpdatePasswordReset(ctx, user.ID, tokenHash, expiresAt); err != nil {
		s.logger.WarnContext(ctx, "failed to store reset token", "err", err)
		return nil
	}

	task, taskErr := tasks.NewPasswordResetTask(user.ID.String(), user.Email, resetToken)
	if taskErr == nil {
		if _, enqErr := s.asynqClient.EnqueueContext(ctx, task); enqErr != nil {
			s.logger.WarnContext(ctx, "failed to enqueue reset email", "err", enqErr)
		}
	}

	return nil
}

// ResetPassword validates the reset token and updates the user's password.
func (s *authService) ResetPassword(ctx context.Context, token, newPassword string) error {
	tokenHash := s.jwtManager.TokenHash(token)

	user, err := s.userRepo.GetByPasswordResetToken(ctx, tokenHash)
	if err != nil {
		return domain.NewError("AUTH_006", "invalid or expired reset token", 400)
	}

	if user.PasswordResetExpiresAt == nil || time.Now().After(*user.PasswordResetExpiresAt) {
		return domain.NewError("AUTH_006", "invalid or expired reset token", 400)
	}

	newHash, err := auth.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("auth: reset password: hash: %w", err)
	}

	return s.userRepo.UpdatePassword(ctx, user.ID, newHash)
}

// VerifyEmail validates the email verification token and marks the user as verified.
func (s *authService) VerifyEmail(ctx context.Context, token string) error {
	return s.userRepo.MarkEmailVerified(ctx, token)
}

// OAuthLogin exchanges an OAuth code for a user profile and returns auth tokens.
func (s *authService) OAuthLogin(ctx context.Context, provider, code, state string) (*domain.AuthTokens, error) {
	if s.oauthMgr == nil {
		return nil, domain.NewError("AUTH_009", "oauth not configured", 501)
	}
	if err := s.oauthMgr.ValidateState(ctx, state); err != nil {
		return nil, domain.ErrUnauthorized
	}

	oauthToken, err := s.oauthMgr.Exchange(ctx, provider, code)
	if err != nil {
		return nil, domain.NewError("AUTH_007", "oauth exchange failed", 400)
	}

	profile, err := s.oauthMgr.GetUserProfile(ctx, provider, oauthToken)
	if err != nil {
		return nil, domain.NewError("AUTH_008", "failed to fetch oauth profile", 400)
	}

	var avatarURL *string
	if profile.AvatarURL != "" {
		avatarURL = &profile.AvatarURL
	}

	user, err := s.userRepo.UpsertOAuth(ctx, profile.Email, profile.Name, profile.Provider, profile.ProviderID, avatarURL)
	if err != nil {
		return nil, fmt.Errorf("auth: oauth login: upsert user: %w", err)
	}

	return s.issueTokens(ctx, user)
}

// issueTokens generates a new access+refresh token pair and stores the session.
func (s *authService) issueTokens(ctx context.Context, user *domain.User) (*domain.AuthTokens, error) {
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.Email, user.SubscriptionTier)
	if err != nil {
		return nil, fmt.Errorf("auth: issue tokens: access token: %w", err)
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("auth: issue tokens: refresh token: %w", err)
	}

	tokenHash := s.jwtManager.TokenHash(refreshToken)
	session := &domain.UserSession{
		UserID:           user.ID,
		RefreshTokenHash: tokenHash,
		ExpiresAt:        time.Now().Add(30 * 24 * time.Hour), // 30 days
	}

	if _, err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("auth: issue tokens: create session: %w", err)
	}

	return &domain.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int((15 * time.Minute).Seconds()),
	}, nil
}

// generateSecureToken returns a cryptographically random hex string (32 bytes).
func generateSecureToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// Ensure authService implements AuthService at compile time.
var _ AuthService = (*authService)(nil)
