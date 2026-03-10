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
	ID                         uuid.UUID        `json:"id"`
	Email                      string           `json:"email"`
	PasswordHash               *string          `json:"-"`
	FullName                   string           `json:"full_name"`
	AvatarURL                  *string          `json:"avatar_url,omitempty"`
	IsEmailVerified            bool             `json:"is_email_verified"`
	EmailVerificationToken     *string          `json:"-"`
	EmailVerificationExpiresAt *time.Time       `json:"-"`
	PasswordResetToken         *string          `json:"-"`
	PasswordResetExpiresAt     *time.Time       `json:"-"`
	OAuthProvider              *string          `json:"oauth_provider,omitempty"`
	OAuthProviderID            *string          `json:"oauth_provider_id,omitempty"`
	SubscriptionTier           SubscriptionTier `json:"subscription_tier"`
	AICreditsBalance           int              `json:"ai_credits_balance"`
	StripeCustomerID           *string          `json:"stripe_customer_id,omitempty"`
	CurrentStreak              int              `json:"current_streak"`
	LongestStreak              int              `json:"longest_streak"`
	LastActiveAt               *time.Time       `json:"last_active_at,omitempty"`
	CreatedAt                  time.Time        `json:"created_at"`
	UpdatedAt                  time.Time        `json:"updated_at"`
	DeletedAt                  *time.Time       `json:"deleted_at,omitempty"`
}

// UserSession represents an active refresh-token session.
type UserSession struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	RefreshTokenHash string     `json:"-"`
	UserAgent        *string    `json:"user_agent,omitempty"`
	IPAddress        *string    `json:"ip_address,omitempty"`
	ExpiresAt        time.Time  `json:"expires_at"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
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
