package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgApprovalLinkRepository implements ApprovalLinkRepository using pgx/v5.
type pgApprovalLinkRepository struct {
	pool *pgxpool.Pool
}

// NewApprovalLinkRepository creates a new ApprovalLinkRepository backed by the provided pool.
func NewApprovalLinkRepository(pool *pgxpool.Pool) ApprovalLinkRepository {
	return &pgApprovalLinkRepository{pool: pool}
}

func scanApprovalLink(row pgx.Row) (*domain.ApprovalLink, error) {
	l := &domain.ApprovalLink{}
	err := row.Scan(
		&l.ID,
		&l.ContentID,
		&l.WorkspaceID,
		&l.Token,
		&l.ReviewerName,
		&l.ReviewerEmail,
		&l.Status,
		&l.Comment,
		&l.ExpiresAt,
		&l.DecidedAt,
		&l.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return l, nil
}

func (r *pgApprovalLinkRepository) Create(ctx context.Context, link *domain.ApprovalLink) (*domain.ApprovalLink, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("approval_links.create").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO approval_links (content_id, workspace_id, token, reviewer_name, reviewer_email, status, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, content_id, workspace_id, token, reviewer_name, reviewer_email, status, comment, expires_at, decided_at, created_at`

	row := r.pool.QueryRow(ctx, q,
		link.ContentID,
		link.WorkspaceID,
		link.Token,
		link.ReviewerName,
		link.ReviewerEmail,
		link.Status,
		link.ExpiresAt,
	)
	return scanApprovalLink(row)
}

func (r *pgApprovalLinkRepository) GetByToken(ctx context.Context, token string) (*domain.ApprovalLink, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("approval_links.get_by_token").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, content_id, workspace_id, token, reviewer_name, reviewer_email, status, comment, expires_at, decided_at, created_at
		FROM approval_links WHERE token = $1`

	row := r.pool.QueryRow(ctx, q, token)
	return scanApprovalLink(row)
}

func (r *pgApprovalLinkRepository) ListByContentID(ctx context.Context, contentID uuid.UUID) ([]*domain.ApprovalLink, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("approval_links.list_by_content").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, content_id, workspace_id, token, reviewer_name, reviewer_email, status, comment, expires_at, decided_at, created_at
		FROM approval_links WHERE content_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, q, contentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []*domain.ApprovalLink
	for rows.Next() {
		l, err := scanApprovalLink(rows)
		if err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	return links, rows.Err()
}

func (r *pgApprovalLinkRepository) UpdateDecision(ctx context.Context, token string, status string, comment string) (*domain.ApprovalLink, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("approval_links.update_decision").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE approval_links
		SET status = $2, comment = $3, decided_at = NOW()
		WHERE token = $1
		RETURNING id, content_id, workspace_id, token, reviewer_name, reviewer_email, status, comment, expires_at, decided_at, created_at`

	row := r.pool.QueryRow(ctx, q, token, status, comment)
	return scanApprovalLink(row)
}

// Compile-time interface check.
var _ ApprovalLinkRepository = (*pgApprovalLinkRepository)(nil)
