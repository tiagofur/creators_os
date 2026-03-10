package domain

import (
	"time"

	"github.com/google/uuid"
)

// SubscriptionTier represents the user's subscription level.
type SubscriptionTier string

const (
	TierFree       SubscriptionTier = "free"
	TierPro        SubscriptionTier = "pro"
	TierEnterprise SubscriptionTier = "enterprise"
)

// User is the core user aggregate.
type User struct {
	ID                         uuid.UUID
	Email                      string
	PasswordHash               *string
	FullName                   string
	AvatarURL                  *string
	IsEmailVerified            bool
	EmailVerificationToken     *string
	EmailVerificationExpiresAt *time.Time
	PasswordResetToken         *string
	PasswordResetExpiresAt     *time.Time
	OAuthProvider              *string
	OAuthProviderID            *string
	SubscriptionTier           SubscriptionTier
	AICreditsBalance           int
	StripeCustomerID           *string
	CurrentStreak              int
	LongestStreak              int
	LastActiveAt               *time.Time
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
	DeletedAt                  *time.Time
}

// UserSession represents an active refresh-token session.
type UserSession struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	RefreshTokenHash string
	UserAgent        *string
	IPAddress        *string
	ExpiresAt        time.Time
	RevokedAt        *time.Time
	CreatedAt        time.Time
}

// UserClaims are the JWT payload fields propagated via context.
type UserClaims struct {
	UserID           uuid.UUID
	Email            string
	SubscriptionTier SubscriptionTier
}

// AuthTokens is the response payload for successful authentication.
type AuthTokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"` // seconds
}
