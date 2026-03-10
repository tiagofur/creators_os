package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgIdeaRepository implements IdeaRepository using pgx/v5.
type pgIdeaRepository struct {
	pool *pgxpool.Pool
}

// NewIdeaRepository creates a new IdeaRepository backed by the provided pool.
func NewIdeaRepository(pool *pgxpool.Pool) IdeaRepository {
	return &pgIdeaRepository{pool: pool}
}

// ---- scan helpers ----

func scanIdea(row pgx.Row) (*domain.Idea, error) {
	idea := &domain.Idea{}
	var metadataJSON []byte
	var platformTarget *string
	err := row.Scan(
		&idea.ID,
		&idea.WorkspaceID,
		&idea.CreatedBy,
		&idea.Title,
		&idea.Description,
		&idea.Status,
		&platformTarget,
		&idea.PromotedToContentID,
		&metadataJSON,
		&idea.CreatedAt,
		&idea.UpdatedAt,
		&idea.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if platformTarget != nil {
		pt := domain.PlatformType(*platformTarget)
		idea.PlatformTarget = &pt
	}
	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &idea.Metadata); err != nil {
			return nil, fmt.Errorf("idea: unmarshal metadata: %w", err)
		}
	}
	if idea.Metadata == nil {
		idea.Metadata = map[string]any{}
	}
	return idea, nil
}

// ---- IdeaRepository implementation ----

func (r *pgIdeaRepository) Create(ctx context.Context, idea *domain.Idea) (*domain.Idea, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.create").Observe(time.Since(start).Seconds())
	}()

	metadataJSON, err := json.Marshal(idea.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	const q = `
		INSERT INTO ideas (workspace_id, created_by, title, description, status, platform_target, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, workspace_id, created_by, title, description, status, platform_target,
		          promoted_to_content_id, metadata, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q,
		idea.WorkspaceID,
		idea.CreatedBy,
		idea.Title,
		idea.Description,
		idea.Status,
		idea.PlatformTarget,
		metadataJSON,
	)
	return scanIdea(row)
}

func (r *pgIdeaRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.get_by_id").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, created_by, title, description, status, platform_target,
		       promoted_to_content_id, metadata, created_at, updated_at, deleted_at
		FROM ideas WHERE id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, id)
	idea, err := scanIdea(row)
	if err != nil {
		return nil, err
	}

	// Load tags
	tags, err := r.listTags(ctx, id)
	if err != nil {
		return nil, err
	}
	idea.Tags = tags

	// Load validation score if present
	score, err := r.getValidationScore(ctx, id)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	idea.ValidationScore = score

	return idea, nil
}

func (r *pgIdeaRepository) List(ctx context.Context, workspaceID uuid.UUID, filter domain.IdeaFilter) ([]*domain.Idea, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.list").Observe(time.Since(start).Seconds())
	}()

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset

	const q = `
		SELECT id, workspace_id, created_by, title, description, status, platform_target,
		       promoted_to_content_id, metadata, created_at, updated_at, deleted_at
		FROM ideas
		WHERE workspace_id = $1
		  AND deleted_at IS NULL
		  AND ($2::idea_status IS NULL OR status = $2)
		  AND ($3::uuid IS NULL OR created_by = $3)
		  AND ($4::platform_type IS NULL OR platform_target = $4)
		ORDER BY created_at DESC
		LIMIT $5 OFFSET $6`

	rows, err := r.pool.Query(ctx, q,
		workspaceID,
		filter.Status,
		filter.CreatedBy,
		filter.PlatformTarget,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ideas []*domain.Idea
	for rows.Next() {
		idea, err := scanIdea(rows)
		if err != nil {
			return nil, err
		}
		ideas = append(ideas, idea)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load tags for each idea
	for _, idea := range ideas {
		tags, err := r.listTags(ctx, idea.ID)
		if err != nil {
			return nil, err
		}
		idea.Tags = tags
	}

	return ideas, nil
}

func (r *pgIdeaRepository) Update(ctx context.Context, idea *domain.Idea) (*domain.Idea, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.update").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE ideas
		SET title = $2, description = $3, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, workspace_id, created_by, title, description, status, platform_target,
		          promoted_to_content_id, metadata, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q, idea.ID, idea.Title, idea.Description)
	return scanIdea(row)
}

func (r *pgIdeaRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.soft_delete").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE ideas SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgIdeaRepository) SaveValidationScore(ctx context.Context, ideaID uuid.UUID, score *domain.IdeaValidationScore) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.save_validation_score").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO idea_validation_scores
		    (idea_id, novelty_score, audience_fit_score, viability_score, urgency_score, personal_fit_score, overall_score, ai_reasoning)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (idea_id) DO UPDATE
		SET novelty_score = EXCLUDED.novelty_score,
		    audience_fit_score = EXCLUDED.audience_fit_score,
		    viability_score = EXCLUDED.viability_score,
		    urgency_score = EXCLUDED.urgency_score,
		    personal_fit_score = EXCLUDED.personal_fit_score,
		    overall_score = EXCLUDED.overall_score,
		    ai_reasoning = EXCLUDED.ai_reasoning,
		    updated_at = NOW()`

	_, err := r.pool.Exec(ctx, q,
		ideaID,
		score.NoveltyScore,
		score.AudienceFitScore,
		score.ViabilityScore,
		score.UrgencyScore,
		score.PersonalFitScore,
		score.OverallScore,
		score.AIReasoning,
	)
	return err
}

func (r *pgIdeaRepository) SetTags(ctx context.Context, ideaID uuid.UUID, tags []string) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.set_tags").Observe(time.Since(start).Seconds())
	}()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("idea: set tags: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Delete existing tags
	if _, err := tx.Exec(ctx, `DELETE FROM idea_tags WHERE idea_id = $1`, ideaID); err != nil {
		return fmt.Errorf("idea: set tags: delete: %w", err)
	}

	// Insert new tags
	for _, tag := range tags {
		if _, err := tx.Exec(ctx, `INSERT INTO idea_tags (idea_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`, ideaID, tag); err != nil {
			return fmt.Errorf("idea: set tags: insert %q: %w", tag, err)
		}
	}

	return tx.Commit(ctx)
}

func (r *pgIdeaRepository) Promote(ctx context.Context, ideaID, contentID uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.promote").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE ideas SET status = 'promoted', promoted_to_content_id = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, ideaID, contentID)
	return err
}

// listTags retrieves tags for an idea.
func (r *pgIdeaRepository) listTags(ctx context.Context, ideaID uuid.UUID) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT tag FROM idea_tags WHERE idea_id = $1 ORDER BY tag`, ideaID)
	if err != nil {
		return nil, fmt.Errorf("idea: list tags: %w", err)
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("idea: list tags: scan: %w", err)
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

// getValidationScore retrieves the validation score for an idea.
func (r *pgIdeaRepository) getValidationScore(ctx context.Context, ideaID uuid.UUID) (*domain.IdeaValidationScore, error) {
	const q = `
		SELECT novelty_score, audience_fit_score, viability_score, urgency_score,
		       personal_fit_score, overall_score, ai_reasoning
		FROM idea_validation_scores WHERE idea_id = $1`

	score := &domain.IdeaValidationScore{}
	err := r.pool.QueryRow(ctx, q, ideaID).Scan(
		&score.NoveltyScore,
		&score.AudienceFitScore,
		&score.ViabilityScore,
		&score.UrgencyScore,
		&score.PersonalFitScore,
		&score.OverallScore,
		&score.AIReasoning,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return score, nil
}

// UpdateStatus updates the status of an idea.
func (r *pgIdeaRepository) UpdateStatus(ctx context.Context, ideaID uuid.UUID, status domain.IdeaStatus) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ideas.update_status").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE ideas SET status = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, ideaID, status)
	return err
}

// Compile-time interface check.
var _ IdeaRepository = (*pgIdeaRepository)(nil)
