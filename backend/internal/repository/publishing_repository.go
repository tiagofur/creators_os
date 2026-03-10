package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
)

type pgPublishingRepository struct {
	pool *pgxpool.Pool
}

// NewPublishingRepository creates a new PublishingRepository backed by the provided pool.
func NewPublishingRepository(pool *pgxpool.Pool) PublishingRepository {
	return &pgPublishingRepository{pool: pool}
}

func scanCredential(row pgx.Row) (*domain.PlatformCredential, error) {
	c := &domain.PlatformCredential{}
	err := row.Scan(
		&c.ID,
		&c.WorkspaceID,
		&c.Platform,
		&c.ChannelID,
		&c.ChannelName,
		&c.EncryptedAccessToken,
		&c.EncryptedRefreshToken,
		&c.Scopes,
		&c.TokenExpiresAt,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *pgPublishingRepository) SaveCredential(ctx context.Context, cred *domain.PlatformCredential) (*domain.PlatformCredential, error) {
	const q = `
		INSERT INTO platform_credentials
			(workspace_id, platform, channel_id, channel_name, encrypted_access_token, encrypted_refresh_token, scopes, token_expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (workspace_id, platform) DO UPDATE SET
			channel_id = EXCLUDED.channel_id,
			channel_name = EXCLUDED.channel_name,
			encrypted_access_token = EXCLUDED.encrypted_access_token,
			encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
			scopes = EXCLUDED.scopes,
			token_expires_at = EXCLUDED.token_expires_at,
			updated_at = NOW()
		RETURNING id, workspace_id, platform, channel_id, channel_name,
		          encrypted_access_token, encrypted_refresh_token, scopes,
		          token_expires_at, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		cred.WorkspaceID,
		cred.Platform,
		cred.ChannelID,
		cred.ChannelName,
		cred.EncryptedAccessToken,
		cred.EncryptedRefreshToken,
		cred.Scopes,
		cred.TokenExpiresAt,
	)
	return scanCredential(row)
}

func (r *pgPublishingRepository) GetCredential(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType) (*domain.PlatformCredential, error) {
	const q = `
		SELECT id, workspace_id, platform, channel_id, channel_name,
		       encrypted_access_token, encrypted_refresh_token, scopes,
		       token_expires_at, created_at, updated_at
		FROM platform_credentials
		WHERE workspace_id = $1 AND platform = $2`

	row := r.pool.QueryRow(ctx, q, workspaceID, platform)
	return scanCredential(row)
}

func (r *pgPublishingRepository) ListCredentials(ctx context.Context, workspaceID uuid.UUID) ([]*domain.PlatformCredential, error) {
	const q = `
		SELECT id, workspace_id, platform, channel_id, channel_name,
		       encrypted_access_token, encrypted_refresh_token, scopes,
		       token_expires_at, created_at, updated_at
		FROM platform_credentials
		WHERE workspace_id = $1
		ORDER BY created_at ASC`

	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []*domain.PlatformCredential
	for rows.Next() {
		c := &domain.PlatformCredential{}
		if err := rows.Scan(
			&c.ID, &c.WorkspaceID, &c.Platform, &c.ChannelID, &c.ChannelName,
			&c.EncryptedAccessToken, &c.EncryptedRefreshToken, &c.Scopes,
			&c.TokenExpiresAt, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		creds = append(creds, c)
	}
	return creds, rows.Err()
}

func (r *pgPublishingRepository) DeleteCredential(ctx context.Context, id uuid.UUID) error {
	const q = `DELETE FROM platform_credentials WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func scanScheduledPost(row pgx.Row) (*domain.ScheduledPost, error) {
	p := &domain.ScheduledPost{}
	err := row.Scan(
		&p.ID,
		&p.WorkspaceID,
		&p.ContentID,
		&p.CredentialID,
		&p.Platform,
		&p.Status,
		&p.ScheduledAt,
		&p.PublishedAt,
		&p.ErrorMessage,
		&p.PlatformPostID,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

func (r *pgPublishingRepository) CreateScheduledPost(ctx context.Context, post *domain.ScheduledPost) (*domain.ScheduledPost, error) {
	const q = `
		INSERT INTO scheduled_posts (workspace_id, content_id, credential_id, platform, status, scheduled_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, workspace_id, content_id, credential_id, platform, status,
		          scheduled_at, published_at, error_message, platform_post_id,
		          created_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		post.WorkspaceID,
		post.ContentID,
		post.CredentialID,
		post.Platform,
		post.Status,
		post.ScheduledAt,
	)
	return scanScheduledPost(row)
}

func (r *pgPublishingRepository) GetScheduledPost(ctx context.Context, id uuid.UUID) (*domain.ScheduledPost, error) {
	const q = `
		SELECT id, workspace_id, content_id, credential_id, platform, status,
		       scheduled_at, published_at, error_message, platform_post_id,
		       created_at, updated_at
		FROM scheduled_posts WHERE id = $1`

	row := r.pool.QueryRow(ctx, q, id)
	return scanScheduledPost(row)
}

func (r *pgPublishingRepository) ListScheduledPosts(ctx context.Context, workspaceID uuid.UUID, from, to time.Time) ([]*domain.ScheduledPost, error) {
	const q = `
		SELECT id, workspace_id, content_id, credential_id, platform, status,
		       scheduled_at, published_at, error_message, platform_post_id,
		       created_at, updated_at
		FROM scheduled_posts
		WHERE workspace_id = $1 AND scheduled_at >= $2 AND scheduled_at <= $3
		ORDER BY scheduled_at ASC`

	rows, err := r.pool.Query(ctx, q, workspaceID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*domain.ScheduledPost
	for rows.Next() {
		p := &domain.ScheduledPost{}
		if err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.ContentID, &p.CredentialID, &p.Platform, &p.Status,
			&p.ScheduledAt, &p.PublishedAt, &p.ErrorMessage, &p.PlatformPostID,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

func (r *pgPublishingRepository) GetDuePosts(ctx context.Context, before time.Time) ([]*domain.ScheduledPost, error) {
	const q = `
		SELECT id, workspace_id, content_id, credential_id, platform, status,
		       scheduled_at, published_at, error_message, platform_post_id,
		       created_at, updated_at
		FROM scheduled_posts
		WHERE status = 'pending' AND scheduled_at <= $1
		ORDER BY scheduled_at ASC`

	rows, err := r.pool.Query(ctx, q, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*domain.ScheduledPost
	for rows.Next() {
		p := &domain.ScheduledPost{}
		if err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.ContentID, &p.CredentialID, &p.Platform, &p.Status,
			&p.ScheduledAt, &p.PublishedAt, &p.ErrorMessage, &p.PlatformPostID,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

func (r *pgPublishingRepository) UpdatePostStatus(ctx context.Context, id uuid.UUID, status string, platformPostID *string, errorMsg *string) error {
	const q = `
		UPDATE scheduled_posts
		SET status = $2,
		    platform_post_id = $3,
		    error_message = $4,
		    published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := r.pool.Exec(ctx, q, id, status, platformPostID, errorMsg)
	return err
}

var _ PublishingRepository = (*pgPublishingRepository)(nil)
