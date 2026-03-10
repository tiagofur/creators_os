package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgRemixRepository implements RemixRepository using pgx/v5.
type pgRemixRepository struct {
	pool *pgxpool.Pool
}

// NewRemixRepository creates a new RemixRepository backed by the provided pool.
func NewRemixRepository(pool *pgxpool.Pool) RemixRepository {
	return &pgRemixRepository{pool: pool}
}

// scanRemixJob reads all remix_jobs columns into a domain.RemixJob.
func scanRemixJob(row pgx.Row) (*domain.RemixJob, error) {
	j := &domain.RemixJob{}
	var resultsJSON []byte
	err := row.Scan(
		&j.ID,
		&j.WorkspaceID,
		&j.UserID,
		&j.Status,
		&j.InputURL,
		&resultsJSON,
		&j.ErrorMessage,
		&j.CreatedAt,
		&j.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if resultsJSON != nil {
		if err := json.Unmarshal(resultsJSON, &j.Results); err != nil {
			return nil, err
		}
	}
	if j.Results == nil {
		j.Results = make(map[string]any)
	}
	return j, nil
}

// Create inserts a new remix job.
func (r *pgRemixRepository) Create(ctx context.Context, job *domain.RemixJob) (*domain.RemixJob, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("remix_jobs.create").Observe(time.Since(start).Seconds())
	}()

	resultsJSON, err := json.Marshal(job.Results)
	if err != nil {
		return nil, err
	}

	const q = `
		INSERT INTO remix_jobs (workspace_id, user_id, status, input_url, results)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, workspace_id, user_id, status, input_url, results, error_message, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		job.WorkspaceID,
		job.UserID,
		job.Status,
		job.InputURL,
		resultsJSON,
	)
	return scanRemixJob(row)
}

// GetByID returns a remix job by ID.
func (r *pgRemixRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.RemixJob, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("remix_jobs.get_by_id").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, user_id, status, input_url, results, error_message, created_at, updated_at
		FROM remix_jobs WHERE id = $1`

	row := r.pool.QueryRow(ctx, q, id)
	return scanRemixJob(row)
}

// UpdateStatus updates the job status and optional error message.
func (r *pgRemixRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, errorMsg *string) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("remix_jobs.update_status").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE remix_jobs SET status = $2, error_message = $3, updated_at = NOW()
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, id, status, errorMsg)
	return err
}

// UpdateResults stores the analysis results and marks the job complete.
func (r *pgRemixRepository) UpdateResults(ctx context.Context, id uuid.UUID, results map[string]any) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("remix_jobs.update_results").Observe(time.Since(start).Seconds())
	}()

	resultsJSON, err := json.Marshal(results)
	if err != nil {
		return err
	}

	const q = `
		UPDATE remix_jobs SET results = $2, updated_at = NOW()
		WHERE id = $1`
	_, err = r.pool.Exec(ctx, q, id, resultsJSON)
	return err
}

// ListByWorkspace returns paginated remix jobs for a workspace.
func (r *pgRemixRepository) ListByWorkspace(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.RemixJob, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("remix_jobs.list_by_workspace").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, user_id, status, input_url, results, error_message, created_at, updated_at
		FROM remix_jobs
		WHERE workspace_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.pool.Query(ctx, q, workspaceID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.RemixJob
	for rows.Next() {
		job, err := scanRemixJob(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, job)
	}
	return result, rows.Err()
}
