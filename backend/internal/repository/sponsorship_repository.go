package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
)

type pgSponsorshipRepository struct {
	pool *pgxpool.Pool
}

// NewSponsorshipRepository creates a new SponsorshipRepository backed by the provided pool.
func NewSponsorshipRepository(pool *pgxpool.Pool) SponsorshipRepository {
	return &pgSponsorshipRepository{pool: pool}
}

func scanSponsorship(row pgx.Row) (*domain.Sponsorship, error) {
	s := &domain.Sponsorship{}
	err := row.Scan(
		&s.ID,
		&s.WorkspaceID,
		&s.BrandName,
		&s.ContactName,
		&s.ContactEmail,
		&s.Status,
		&s.DealValue,
		&s.Currency,
		&s.Notes,
		&s.StartDate,
		&s.EndDate,
		&s.CreatedAt,
		&s.UpdatedAt,
		&s.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

const sponsorshipCols = `id, workspace_id, brand_name, contact_name, contact_email, status, deal_value, currency, notes, start_date, end_date, created_at, updated_at, deleted_at`

func (r *pgSponsorshipRepository) Create(ctx context.Context, s *domain.Sponsorship) (*domain.Sponsorship, error) {
	q := fmt.Sprintf(`
		INSERT INTO sponsorships (workspace_id, brand_name, contact_name, contact_email, status, deal_value, currency, notes, start_date, end_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING %s`, sponsorshipCols)

	row := r.pool.QueryRow(ctx, q,
		s.WorkspaceID, s.BrandName, s.ContactName, s.ContactEmail,
		s.Status, s.DealValue, s.Currency, s.Notes, s.StartDate, s.EndDate,
	)
	return scanSponsorship(row)
}

func (r *pgSponsorshipRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Sponsorship, error) {
	q := fmt.Sprintf(`SELECT %s FROM sponsorships WHERE id = $1 AND deleted_at IS NULL`, sponsorshipCols)
	row := r.pool.QueryRow(ctx, q, id)
	return scanSponsorship(row)
}

func (r *pgSponsorshipRepository) List(ctx context.Context, workspaceID uuid.UUID, filter domain.SponsorshipFilter) ([]*domain.Sponsorship, error) {
	args := []any{workspaceID}
	where := "workspace_id = $1 AND deleted_at IS NULL"

	if filter.Status != nil {
		args = append(args, *filter.Status)
		where += fmt.Sprintf(" AND status = $%d", len(args))
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		where += fmt.Sprintf(" AND created_at >= $%d", len(args))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		where += fmt.Sprintf(" AND created_at <= $%d", len(args))
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset

	q := fmt.Sprintf(`SELECT %s FROM sponsorships WHERE %s ORDER BY created_at DESC LIMIT %d OFFSET %d`,
		sponsorshipCols, where, limit, offset)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Sponsorship
	for rows.Next() {
		s := &domain.Sponsorship{}
		if err := rows.Scan(
			&s.ID, &s.WorkspaceID, &s.BrandName, &s.ContactName, &s.ContactEmail,
			&s.Status, &s.DealValue, &s.Currency, &s.Notes, &s.StartDate, &s.EndDate,
			&s.CreatedAt, &s.UpdatedAt, &s.DeletedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func (r *pgSponsorshipRepository) Update(ctx context.Context, s *domain.Sponsorship) (*domain.Sponsorship, error) {
	q := fmt.Sprintf(`
		UPDATE sponsorships SET
			brand_name = $2, contact_name = $3, contact_email = $4,
			status = $5, deal_value = $6, currency = $7, notes = $8,
			start_date = $9, end_date = $10, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING %s`, sponsorshipCols)

	row := r.pool.QueryRow(ctx, q,
		s.ID, s.BrandName, s.ContactName, s.ContactEmail,
		s.Status, s.DealValue, s.Currency, s.Notes, s.StartDate, s.EndDate,
	)
	return scanSponsorship(row)
}

func (r *pgSponsorshipRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE sponsorships SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgSponsorshipRepository) AddMessage(ctx context.Context, msg *domain.SponsorshipMessage) (*domain.SponsorshipMessage, error) {
	const q = `
		INSERT INTO sponsorship_messages (sponsorship_id, user_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, sponsorship_id, user_id, content, created_at`

	m := &domain.SponsorshipMessage{}
	err := r.pool.QueryRow(ctx, q, msg.SponsorshipID, msg.UserID, msg.Content).Scan(
		&m.ID, &m.SponsorshipID, &m.UserID, &m.Content, &m.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *pgSponsorshipRepository) ListMessages(ctx context.Context, sponsorshipID uuid.UUID) ([]*domain.SponsorshipMessage, error) {
	const q = `
		SELECT id, sponsorship_id, user_id, content, created_at
		FROM sponsorship_messages
		WHERE sponsorship_id = $1
		ORDER BY created_at ASC`

	rows, err := r.pool.Query(ctx, q, sponsorshipID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []*domain.SponsorshipMessage
	for rows.Next() {
		m := &domain.SponsorshipMessage{}
		if err := rows.Scan(&m.ID, &m.SponsorshipID, &m.UserID, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

var _ SponsorshipRepository = (*pgSponsorshipRepository)(nil)
