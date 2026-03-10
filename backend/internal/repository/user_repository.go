package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/cache"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgUserRepository implements UserRepository using pgx/v5 directly.
type pgUserRepository struct {
	pool  *pgxpool.Pool
	cache *cache.Cache // optional; nil disables caching
}

// NewUserRepository creates a new UserRepository backed by the provided pool.
// Pass an optional *cache.Cache to enable user profile caching.
func NewUserRepository(pool *pgxpool.Pool, c ...*cache.Cache) UserRepository {
	r := &pgUserRepository{pool: pool}
	if len(c) > 0 {
		r.cache = c[0]
	}
	return r
}

// scanUser reads all user columns from a pgx.Row or pgx.Rows into a domain.User.
func scanUser(row pgx.Row) (*domain.User, error) {
	u := &domain.User{}
	err := row.Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.FullName,
		&u.AvatarURL,
		&u.IsEmailVerified,
		&u.EmailVerificationToken,
		&u.EmailVerificationExpiresAt,
		&u.PasswordResetToken,
		&u.PasswordResetExpiresAt,
		&u.OAuthProvider,
		&u.OAuthProviderID,
		&u.SubscriptionTier,
		&u.AICreditsBalance,
		&u.StripeCustomerID,
		&u.CurrentStreak,
		&u.LongestStreak,
		&u.LastActiveAt,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *pgUserRepository) Create(ctx context.Context, user *domain.User) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.create").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO users (email, password_hash, full_name, avatar_url, oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, email, password_hash, full_name, avatar_url, is_email_verified,
		          email_verification_token, email_verification_expires_at,
		          password_reset_token, password_reset_expires_at,
		          oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		          stripe_customer_id, current_streak, longest_streak, last_active_at,
		          created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.AvatarURL,
		user.OAuthProvider,
		user.OAuthProviderID,
		user.SubscriptionTier,
		user.AICreditsBalance,
	)
	return scanUser(row)
}

func (r *pgUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.get_by_id").Observe(time.Since(start).Seconds())
	}()

	// Try cache first.
	if r.cache != nil {
		if data, err := r.cache.GetUserProfile(ctx, id.String()); err == nil {
			var u domain.User
			if jsonErr := json.Unmarshal(data, &u); jsonErr == nil {
				return &u, nil
			}
		}
	}

	const q = `
		SELECT id, email, password_hash, full_name, avatar_url, is_email_verified,
		       email_verification_token, email_verification_expires_at,
		       password_reset_token, password_reset_expires_at,
		       oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		       stripe_customer_id, current_streak, longest_streak, last_active_at,
		       created_at, updated_at, deleted_at
		FROM users WHERE id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, id)
	u, err := scanUser(row)
	if err != nil {
		return nil, err
	}

	// Populate cache.
	if r.cache != nil {
		_ = r.cache.SetUserProfile(ctx, id.String(), u)
	}

	return u, nil
}

func (r *pgUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.get_by_email").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, email, password_hash, full_name, avatar_url, is_email_verified,
		       email_verification_token, email_verification_expires_at,
		       password_reset_token, password_reset_expires_at,
		       oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		       stripe_customer_id, current_streak, longest_streak, last_active_at,
		       created_at, updated_at, deleted_at
		FROM users WHERE email = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, email)
	return scanUser(row)
}

func (r *pgUserRepository) GetByOAuth(ctx context.Context, provider, providerID string) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.get_by_oauth").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, email, password_hash, full_name, avatar_url, is_email_verified,
		       email_verification_token, email_verification_expires_at,
		       password_reset_token, password_reset_expires_at,
		       oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		       stripe_customer_id, current_streak, longest_streak, last_active_at,
		       created_at, updated_at, deleted_at
		FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, provider, providerID)
	return scanUser(row)
}

func (r *pgUserRepository) Update(ctx context.Context, user *domain.User) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.update").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE users SET full_name = $2, avatar_url = $3, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, email, password_hash, full_name, avatar_url, is_email_verified,
		          email_verification_token, email_verification_expires_at,
		          password_reset_token, password_reset_expires_at,
		          oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		          stripe_customer_id, current_streak, longest_streak, last_active_at,
		          created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q, user.ID, user.FullName, user.AvatarURL)
	updated, err := scanUser(row)
	if err != nil {
		return nil, err
	}
	if r.cache != nil {
		_ = r.cache.DeleteUserProfile(ctx, user.ID.String())
	}
	return updated, nil
}

func (r *pgUserRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.soft_delete").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgUserRepository) UpdateSubscriptionTier(ctx context.Context, id uuid.UUID, tier domain.SubscriptionTier) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.update_subscription_tier").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE users SET subscription_tier = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id, tier)
	return err
}

func (r *pgUserRepository) DecrementAICredits(ctx context.Context, id uuid.UUID, amount int) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.decrement_ai_credits").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE users SET ai_credits_balance = ai_credits_balance - $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL AND ai_credits_balance >= $2`
	tag, err := r.pool.Exec(ctx, q, id, amount)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.NewError("CREDITS_INSUFFICIENT", "insufficient AI credits", 402)
	}
	return nil
}

func (r *pgUserRepository) GetAICreditsBalance(ctx context.Context, id uuid.UUID) (int, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.get_ai_credits").Observe(time.Since(start).Seconds())
	}()

	const q = `SELECT ai_credits_balance FROM users WHERE id = $1 AND deleted_at IS NULL`
	var balance int
	err := r.pool.QueryRow(ctx, q, id).Scan(&balance)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, domain.ErrNotFound
		}
		return 0, err
	}
	return balance, nil
}

func (r *pgUserRepository) UpdateEmailVerification(ctx context.Context, id uuid.UUID, token string, expiresAt time.Time) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.update_email_verification").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE users SET email_verification_token = $2, email_verification_expires_at = $3, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id, token, expiresAt)
	return err
}

func (r *pgUserRepository) MarkEmailVerified(ctx context.Context, token string) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.mark_email_verified").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE users
		SET is_email_verified = true,
		    email_verification_token = NULL,
		    email_verification_expires_at = NULL,
		    updated_at = NOW()
		WHERE email_verification_token = $1
		  AND email_verification_expires_at > NOW()
		  AND deleted_at IS NULL`
	tag, err := r.pool.Exec(ctx, q, token)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.NewError("AUTH_004", "invalid or expired verification token", 400)
	}
	return nil
}

func (r *pgUserRepository) UpdatePasswordReset(ctx context.Context, id uuid.UUID, tokenHash string, expiresAt time.Time) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.update_password_reset").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE users SET password_reset_token = $2, password_reset_expires_at = $3, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id, tokenHash, expiresAt)
	return err
}

func (r *pgUserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.update_password").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE users
		SET password_hash = $2,
		    password_reset_token = NULL,
		    password_reset_expires_at = NULL,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id, passwordHash)
	return err
}

func (r *pgUserRepository) GetByPasswordResetToken(ctx context.Context, tokenHash string) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.get_by_reset_token").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, email, password_hash, full_name, avatar_url, is_email_verified,
		       email_verification_token, email_verification_expires_at,
		       password_reset_token, password_reset_expires_at,
		       oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		       stripe_customer_id, current_streak, longest_streak, last_active_at,
		       created_at, updated_at, deleted_at
		FROM users WHERE password_reset_token = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, tokenHash)
	return scanUser(row)
}

func (r *pgUserRepository) UpsertOAuth(ctx context.Context, email, fullName, provider, providerID string, avatarURL *string) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.upsert_oauth").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO users (email, full_name, avatar_url, oauth_provider, oauth_provider_id, is_email_verified)
		VALUES ($1, $2, $3, $4, $5, true)
		ON CONFLICT (email) DO UPDATE SET
		    oauth_provider = EXCLUDED.oauth_provider,
		    oauth_provider_id = EXCLUDED.oauth_provider_id,
		    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
		    updated_at = NOW()
		RETURNING id, email, password_hash, full_name, avatar_url, is_email_verified,
		          email_verification_token, email_verification_expires_at,
		          password_reset_token, password_reset_expires_at,
		          oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		          stripe_customer_id, current_streak, longest_streak, last_active_at,
		          created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q, email, fullName, avatarURL, provider, providerID)
	return scanUser(row)
}

func (r *pgUserRepository) UpdateStripeCustomerID(ctx context.Context, id uuid.UUID, stripeCustomerID string) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.update_stripe_customer_id").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE users SET stripe_customer_id = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id, stripeCustomerID)
	return err
}

func (r *pgUserRepository) GetByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*domain.User, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("users.get_by_stripe_customer_id").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, email, password_hash, full_name, avatar_url, is_email_verified,
		       email_verification_token, email_verification_expires_at,
		       password_reset_token, password_reset_expires_at,
		       oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance,
		       stripe_customer_id, current_streak, longest_streak, last_active_at,
		       created_at, updated_at, deleted_at
		FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, stripeCustomerID)
	return scanUser(row)
}

// ---- SessionRepository ----

// pgSessionRepository implements SessionRepository using pgx/v5 directly.
type pgSessionRepository struct {
	pool *pgxpool.Pool
}

// NewSessionRepository creates a new SessionRepository backed by the provided pool.
func NewSessionRepository(pool *pgxpool.Pool) SessionRepository {
	return &pgSessionRepository{pool: pool}
}

func scanSession(row pgx.Row) (*domain.UserSession, error) {
	s := &domain.UserSession{}
	err := row.Scan(
		&s.ID,
		&s.UserID,
		&s.RefreshTokenHash,
		&s.UserAgent,
		&s.IPAddress,
		&s.ExpiresAt,
		&s.RevokedAt,
		&s.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *pgSessionRepository) Create(ctx context.Context, session *domain.UserSession) (*domain.UserSession, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("sessions.create").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at`

	row := r.pool.QueryRow(ctx, q,
		session.UserID,
		session.RefreshTokenHash,
		session.UserAgent,
		session.IPAddress,
		session.ExpiresAt,
	)
	return scanSession(row)
}

func (r *pgSessionRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*domain.UserSession, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("sessions.get_by_token_hash").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at
		FROM user_sessions
		WHERE refresh_token_hash = $1`

	row := r.pool.QueryRow(ctx, q, tokenHash)
	return scanSession(row)
}

func (r *pgSessionRepository) Revoke(ctx context.Context, tokenHash string) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("sessions.revoke").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`
	_, err := r.pool.Exec(ctx, q, tokenHash)
	return err
}

func (r *pgSessionRepository) RevokeAll(ctx context.Context, userID uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("sessions.revoke_all").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`
	_, err := r.pool.Exec(ctx, q, userID)
	return err
}
