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

// pgSeriesRepository implements SeriesRepository using pgx/v5.
type pgSeriesRepository struct {
	pool *pgxpool.Pool
}

// NewSeriesRepository creates a new SeriesRepository backed by the provided pool.
func NewSeriesRepository(pool *pgxpool.Pool) SeriesRepository {
	return &pgSeriesRepository{pool: pool}
}

// ---- scan helpers ----

func scanSeries(row pgx.Row) (*domain.Series, error) {
	s := &domain.Series{}
	var templateJSON []byte
	var platform *string
	err := row.Scan(
		&s.ID,
		&s.WorkspaceID,
		&s.CreatedBy,
		&s.Title,
		&s.Description,
		&platform,
		&templateJSON,
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
	if platform != nil {
		pt := domain.PlatformType(*platform)
		s.Platform = &pt
	}
	if len(templateJSON) > 0 {
		if err := json.Unmarshal(templateJSON, &s.Template); err != nil {
			return nil, fmt.Errorf("series: unmarshal template: %w", err)
		}
	}
	if s.Template == nil {
		s.Template = map[string]any{}
	}
	return s, nil
}

func scanEpisode(row pgx.Row) (*domain.SeriesEpisode, error) {
	ep := &domain.SeriesEpisode{}
	err := row.Scan(
		&ep.ID,
		&ep.SeriesID,
		&ep.ContentID,
		&ep.EpisodeNumber,
		&ep.Title,
		&ep.Status,
		&ep.CreatedAt,
		&ep.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return ep, nil
}

func scanSchedule(row pgx.Row) (*domain.SeriesPublishingSchedule, error) {
	sched := &domain.SeriesPublishingSchedule{}
	err := row.Scan(
		&sched.ID,
		&sched.SeriesID,
		&sched.Frequency,
		&sched.DayOfWeek,
		&sched.TimeOfDay,
		&sched.Timezone,
		&sched.IsActive,
		&sched.CreatedAt,
		&sched.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return sched, nil
}

// ---- SeriesRepository implementation ----

func (r *pgSeriesRepository) Create(ctx context.Context, s *domain.Series) (*domain.Series, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.create").Observe(time.Since(start).Seconds())
	}()

	templateJSON, err := json.Marshal(s.Template)
	if err != nil {
		templateJSON = []byte("{}")
	}

	const q = `
		INSERT INTO series (workspace_id, created_by, title, description, platform, template)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q,
		s.WorkspaceID,
		s.CreatedBy,
		s.Title,
		s.Description,
		s.Platform,
		templateJSON,
	)
	return scanSeries(row)
}

func (r *pgSeriesRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Series, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.get_by_id").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at
		FROM series WHERE id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, id)
	return scanSeries(row)
}

func (r *pgSeriesRepository) List(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.Series, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.list").Observe(time.Since(start).Seconds())
	}()

	if limit <= 0 {
		limit = 50
	}

	const q = `
		SELECT id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at
		FROM series
		WHERE workspace_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.pool.Query(ctx, q, workspaceID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var series []*domain.Series
	for rows.Next() {
		s, err := scanSeries(rows)
		if err != nil {
			return nil, err
		}
		series = append(series, s)
	}
	return series, rows.Err()
}

func (r *pgSeriesRepository) Update(ctx context.Context, s *domain.Series) (*domain.Series, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.update").Observe(time.Since(start).Seconds())
	}()

	var templateJSON []byte
	if s.Template != nil {
		b, err := json.Marshal(s.Template)
		if err == nil {
			templateJSON = b
		}
	}

	const q = `
		UPDATE series
		SET title = COALESCE($2, title),
		    description = COALESCE($3, description),
		    platform = COALESCE($4, platform),
		    template = COALESCE($5, template),
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q, s.ID, s.Title, s.Description, s.Platform, templateJSON)
	return scanSeries(row)
}

func (r *pgSeriesRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.soft_delete").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE series SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgSeriesRepository) AddEpisode(ctx context.Context, ep *domain.SeriesEpisode) (*domain.SeriesEpisode, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.add_episode").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO series_episodes (series_id, content_id, episode_number, title, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, series_id, content_id, episode_number, title, status, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		ep.SeriesID,
		ep.ContentID,
		ep.EpisodeNumber,
		ep.Title,
		ep.Status,
	)
	return scanEpisode(row)
}

func (r *pgSeriesRepository) GetEpisode(ctx context.Context, id uuid.UUID) (*domain.SeriesEpisode, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.get_episode").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, series_id, content_id, episode_number, title, status, created_at, updated_at
		FROM series_episodes WHERE id = $1`

	row := r.pool.QueryRow(ctx, q, id)
	return scanEpisode(row)
}

func (r *pgSeriesRepository) ListEpisodes(ctx context.Context, seriesID uuid.UUID) ([]*domain.SeriesEpisode, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.list_episodes").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, series_id, content_id, episode_number, title, status, created_at, updated_at
		FROM series_episodes WHERE series_id = $1
		ORDER BY episode_number ASC`

	rows, err := r.pool.Query(ctx, q, seriesID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var episodes []*domain.SeriesEpisode
	for rows.Next() {
		ep, err := scanEpisode(rows)
		if err != nil {
			return nil, err
		}
		episodes = append(episodes, ep)
	}
	return episodes, rows.Err()
}

func (r *pgSeriesRepository) UpdateEpisode(ctx context.Context, ep *domain.SeriesEpisode) (*domain.SeriesEpisode, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.update_episode").Observe(time.Since(start).Seconds())
	}()

	const q = `
		UPDATE series_episodes
		SET title = COALESCE($2, title),
		    status = COALESCE($3, status),
		    content_id = COALESCE($4, content_id),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, series_id, content_id, episode_number, title, status, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q, ep.ID, ep.Title, ep.Status, ep.ContentID)
	return scanEpisode(row)
}

func (r *pgSeriesRepository) DeleteEpisode(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.delete_episode").Observe(time.Since(start).Seconds())
	}()

	const q = `DELETE FROM series_episodes WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

func (r *pgSeriesRepository) UpsertSchedule(ctx context.Context, schedule *domain.SeriesPublishingSchedule) (*domain.SeriesPublishingSchedule, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.upsert_schedule").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO series_publishing_schedule (series_id, frequency, day_of_week, time_of_day, timezone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (series_id) DO UPDATE
		SET frequency = EXCLUDED.frequency,
		    day_of_week = EXCLUDED.day_of_week,
		    time_of_day = EXCLUDED.time_of_day,
		    timezone = EXCLUDED.timezone,
		    is_active = EXCLUDED.is_active,
		    updated_at = NOW()
		RETURNING id, series_id, frequency, day_of_week, time_of_day, timezone, is_active, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		schedule.SeriesID,
		schedule.Frequency,
		schedule.DayOfWeek,
		schedule.TimeOfDay,
		schedule.Timezone,
		schedule.IsActive,
	)
	return scanSchedule(row)
}

func (r *pgSeriesRepository) GetSchedule(ctx context.Context, seriesID uuid.UUID) (*domain.SeriesPublishingSchedule, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("series.get_schedule").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, series_id, frequency, day_of_week, time_of_day, timezone, is_active, created_at, updated_at
		FROM series_publishing_schedule WHERE series_id = $1`

	row := r.pool.QueryRow(ctx, q, seriesID)
	return scanSchedule(row)
}

// Compile-time interface check.
var _ SeriesRepository = (*pgSeriesRepository)(nil)
