package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgContentRepository implements ContentRepository using pgx/v5.
type pgContentRepository struct {
	pool *pgxpool.Pool
}

// NewContentRepository creates a new ContentRepository backed by the provided pool.
func NewContentRepository(pool *pgxpool.Pool) ContentRepository {
	return &pgContentRepository{pool: pool}
}

// ---- scan helpers ----

func scanContent(row pgx.Row) (*domain.Content, error) {
	c := &domain.Content{}
	var metadataJSON []byte
	var platformTarget *string
	err := row.Scan(
		&c.ID,
		&c.WorkspaceID,
		&c.CreatedBy,
		&c.Title,
		&c.Description,
		&c.Status,
		&c.ContentType,
		&platformTarget,
		&c.ScheduledAt,
		&c.PublishedAt,
		&c.DueDate,
		&metadataJSON,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if platformTarget != nil {
		pt := domain.PlatformType(*platformTarget)
		c.PlatformTarget = &pt
	}
	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &c.Metadata); err != nil {
			return nil, fmt.Errorf("content: unmarshal metadata: %w", err)
		}
	}
	if c.Metadata == nil {
		c.Metadata = map[string]any{}
	}
	return c, nil
}

func scanAssignment(row pgx.Row) (*domain.ContentAssignment, error) {
	a := &domain.ContentAssignment{}
	err := row.Scan(
		&a.ID,
		&a.ContentID,
		&a.UserID,
		&a.Role,
		&a.AssignedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

// ---- ContentRepository implementation ----

func (r *pgContentRepository) Create(ctx context.Context, content *domain.Content) (*domain.Content, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.create").Observe(time.Since(start).Seconds())
	}()

	metadataJSON, err := json.Marshal(content.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	const q = `
		INSERT INTO contents (workspace_id, created_by, title, description, status, content_type, platform_target, scheduled_at, published_at, due_date, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, workspace_id, created_by, title, description, status, content_type, platform_target,
		          scheduled_at, published_at, due_date, metadata, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q,
		content.WorkspaceID,
		content.CreatedBy,
		content.Title,
		content.Description,
		content.Status,
		content.ContentType,
		content.PlatformTarget,
		content.ScheduledAt,
		content.PublishedAt,
		content.DueDate,
		metadataJSON,
	)
	return scanContent(row)
}

func (r *pgContentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Content, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.get_by_id").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, created_by, title, description, status, content_type, platform_target,
		       scheduled_at, published_at, due_date, metadata, created_at, updated_at, deleted_at
		FROM contents WHERE id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, id)
	return scanContent(row)
}

func (r *pgContentRepository) List(ctx context.Context, workspaceID uuid.UUID, filter domain.ContentFilter) ([]*domain.Content, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.list").Observe(time.Since(start).Seconds())
	}()

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset

	// Build dynamic WHERE clause
	conditions := []string{"c.workspace_id = $1", "c.deleted_at IS NULL"}
	args := []any{workspaceID}
	argIdx := 2

	if len(filter.Statuses) > 0 {
		conditions = append(conditions, fmt.Sprintf("c.status = ANY($%d::content_status[])", argIdx))
		args = append(args, filter.Statuses)
		argIdx++
	}

	if filter.Platform != nil {
		conditions = append(conditions, fmt.Sprintf("c.platform_target = $%d", argIdx))
		args = append(args, filter.Platform)
		argIdx++
	}

	joinClause := ""
	if filter.AssignedTo != nil {
		joinClause = "INNER JOIN content_assignments ca ON c.id = ca.content_id AND ca.user_id = $" + fmt.Sprintf("%d", argIdx)
		args = append(args, filter.AssignedTo)
		argIdx++
	}

	args = append(args, limit, offset)
	limitIdx := argIdx
	offsetIdx := argIdx + 1

	q := fmt.Sprintf(`
		SELECT c.id, c.workspace_id, c.created_by, c.title, c.description, c.status, c.content_type, c.platform_target,
		       c.scheduled_at, c.published_at, c.due_date, c.metadata, c.created_at, c.updated_at, c.deleted_at
		FROM contents c
		%s
		WHERE %s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d`,
		joinClause,
		strings.Join(conditions, " AND "),
		limitIdx,
		offsetIdx,
	)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contents []*domain.Content
	for rows.Next() {
		c, err := scanContent(rows)
		if err != nil {
			return nil, err
		}
		contents = append(contents, c)
	}
	return contents, rows.Err()
}

func (r *pgContentRepository) Update(ctx context.Context, content *domain.Content) (*domain.Content, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.update").Observe(time.Since(start).Seconds())
	}()

	metadataJSON, err := json.Marshal(content.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	const q = `
		UPDATE contents
		SET title = $2,
		    description = $3,
		    platform_target = $4,
		    due_date = $5,
		    scheduled_at = $6,
		    metadata = $7,
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, workspace_id, created_by, title, description, status, content_type, platform_target,
		          scheduled_at, published_at, due_date, metadata, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q,
		content.ID,
		content.Title,
		content.Description,
		content.PlatformTarget,
		content.DueDate,
		content.ScheduledAt,
		metadataJSON,
	)
	return scanContent(row)
}

func (r *pgContentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.update_status").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE contents SET status = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id, status)
	return err
}

func (r *pgContentRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.soft_delete").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE contents SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgContentRepository) AddAssignment(ctx context.Context, assignment *domain.ContentAssignment) (*domain.ContentAssignment, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.add_assignment").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO content_assignments (content_id, user_id, role)
		VALUES ($1, $2, $3)
		RETURNING id, content_id, user_id, role, assigned_at`

	row := r.pool.QueryRow(ctx, q, assignment.ContentID, assignment.UserID, assignment.Role)
	return scanAssignment(row)
}

func (r *pgContentRepository) RemoveAssignment(ctx context.Context, contentID, userID uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.remove_assignment").Observe(time.Since(start).Seconds())
	}()

	const q = `DELETE FROM content_assignments WHERE content_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, q, contentID, userID)
	return err
}

func (r *pgContentRepository) ListAssignments(ctx context.Context, contentID uuid.UUID) ([]*domain.ContentAssignment, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.list_assignments").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, content_id, user_id, role, assigned_at
		FROM content_assignments WHERE content_id = $1
		ORDER BY assigned_at ASC`

	rows, err := r.pool.Query(ctx, q, contentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []*domain.ContentAssignment
	for rows.Next() {
		a, err := scanAssignment(rows)
		if err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}

func (r *pgContentRepository) EnsurePartitionExists(ctx context.Context, month time.Time) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("contents.ensure_partition").Observe(time.Since(start).Seconds())
	}()

	// Compute partition name and bounds
	partName := fmt.Sprintf("content_analytics_%d_%02d", month.Year(), month.Month())
	from := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, 0)
	indexName := fmt.Sprintf("idx_%s_content", partName)

	q := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s PARTITION OF content_analytics
		FOR VALUES FROM ('%s') TO ('%s')`,
		partName,
		from.Format("2006-01-02"),
		to.Format("2006-01-02"),
	)
	if _, err := r.pool.Exec(ctx, q); err != nil {
		return fmt.Errorf("content: ensure partition %s: %w", partName, err)
	}

	// Create index if not exists
	idxQ := fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s ON %s(content_id, recorded_at DESC)`, indexName, partName)
	if _, err := r.pool.Exec(ctx, idxQ); err != nil {
		return fmt.Errorf("content: ensure partition index %s: %w", indexName, err)
	}

	return nil
}

// Compile-time interface check.
var _ ContentRepository = (*pgContentRepository)(nil)
