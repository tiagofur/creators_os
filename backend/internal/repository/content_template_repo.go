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

// pgContentTemplateRepository implements ContentTemplateRepository using pgx/v5.
type pgContentTemplateRepository struct {
	pool *pgxpool.Pool
}

// NewContentTemplateRepository creates a new ContentTemplateRepository backed by the provided pool.
func NewContentTemplateRepository(pool *pgxpool.Pool) ContentTemplateRepository {
	return &pgContentTemplateRepository{pool: pool}
}

// scanContentTemplate scans a single content_templates row into a domain object.
func scanContentTemplate(row pgx.Row) (*domain.ContentTemplate, error) {
	t := &domain.ContentTemplate{}
	var checklistJSON, metadataJSON []byte
	var platformTarget *string
	err := row.Scan(
		&t.ID,
		&t.WorkspaceID,
		&t.Name,
		&t.Description,
		&t.ContentType,
		&platformTarget,
		&checklistJSON,
		&t.PromptTemplate,
		&metadataJSON,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if platformTarget != nil {
		pt := domain.PlatformType(*platformTarget)
		t.PlatformTarget = &pt
	}
	if len(checklistJSON) > 0 {
		if err := json.Unmarshal(checklistJSON, &t.DefaultChecklist); err != nil {
			return nil, fmt.Errorf("content_template: unmarshal default_checklist: %w", err)
		}
	}
	if t.DefaultChecklist == nil {
		t.DefaultChecklist = map[string]any{}
	}
	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &t.Metadata); err != nil {
			return nil, fmt.Errorf("content_template: unmarshal metadata: %w", err)
		}
	}
	if t.Metadata == nil {
		t.Metadata = map[string]any{}
	}
	return t, nil
}

const templateColumns = `id, workspace_id, name, description, content_type, platform_target, default_checklist, prompt_template, metadata, created_at, updated_at`

func (r *pgContentTemplateRepository) Create(ctx context.Context, t *domain.ContentTemplate) (*domain.ContentTemplate, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("content_templates.create").Observe(time.Since(start).Seconds())
	}()

	checklistJSON, err := json.Marshal(t.DefaultChecklist)
	if err != nil {
		checklistJSON = []byte("{}")
	}
	metadataJSON, err := json.Marshal(t.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	q := fmt.Sprintf(`
		INSERT INTO content_templates (workspace_id, name, description, content_type, platform_target, default_checklist, prompt_template, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING %s`, templateColumns)

	row := r.pool.QueryRow(ctx, q,
		t.WorkspaceID,
		t.Name,
		t.Description,
		t.ContentType,
		t.PlatformTarget,
		checklistJSON,
		t.PromptTemplate,
		metadataJSON,
	)
	return scanContentTemplate(row)
}

func (r *pgContentTemplateRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentTemplate, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("content_templates.get_by_id").Observe(time.Since(start).Seconds())
	}()

	q := fmt.Sprintf(`SELECT %s FROM content_templates WHERE id = $1`, templateColumns)
	row := r.pool.QueryRow(ctx, q, id)
	return scanContentTemplate(row)
}

func (r *pgContentTemplateRepository) List(ctx context.Context, workspaceID uuid.UUID) ([]*domain.ContentTemplate, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("content_templates.list").Observe(time.Since(start).Seconds())
	}()

	q := fmt.Sprintf(`SELECT %s FROM content_templates WHERE workspace_id = $1 ORDER BY created_at DESC`, templateColumns)
	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []*domain.ContentTemplate
	for rows.Next() {
		t, err := scanContentTemplate(rows)
		if err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, rows.Err()
}

func (r *pgContentTemplateRepository) Update(ctx context.Context, t *domain.ContentTemplate) (*domain.ContentTemplate, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("content_templates.update").Observe(time.Since(start).Seconds())
	}()

	checklistJSON, err := json.Marshal(t.DefaultChecklist)
	if err != nil {
		checklistJSON = []byte("{}")
	}
	metadataJSON, err := json.Marshal(t.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	q := fmt.Sprintf(`
		UPDATE content_templates
		SET name = $2,
		    description = $3,
		    content_type = $4,
		    platform_target = $5,
		    default_checklist = $6,
		    prompt_template = $7,
		    metadata = $8,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING %s`, templateColumns)

	row := r.pool.QueryRow(ctx, q,
		t.ID,
		t.Name,
		t.Description,
		t.ContentType,
		t.PlatformTarget,
		checklistJSON,
		t.PromptTemplate,
		metadataJSON,
	)
	return scanContentTemplate(row)
}

func (r *pgContentTemplateRepository) Delete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("content_templates.delete").Observe(time.Since(start).Seconds())
	}()

	const q = `DELETE FROM content_templates WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

// Compile-time interface check.
var _ ContentTemplateRepository = (*pgContentTemplateRepository)(nil)
