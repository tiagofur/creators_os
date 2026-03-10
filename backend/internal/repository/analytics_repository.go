package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
)

// pgAnalyticsRepository implements AnalyticsRepository using pgx/v5.
// TODO: Use a read replica pool when one becomes available.
type pgAnalyticsRepository struct {
	pool *pgxpool.Pool
}

// NewAnalyticsRepository creates a new AnalyticsRepository backed by the provided pool.
func NewAnalyticsRepository(pool *pgxpool.Pool) AnalyticsRepository {
	return &pgAnalyticsRepository{pool: pool}
}

func (r *pgAnalyticsRepository) SavePlatformAnalytics(ctx context.Context, a *domain.PlatformAnalytics) error {
	const q = `
		INSERT INTO platform_analytics (workspace_id, platform, followers_count, total_views, total_engagement, recorded_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.pool.Exec(ctx, q,
		a.WorkspaceID,
		a.Platform,
		a.FollowersCount,
		a.TotalViews,
		a.TotalEngagement,
		a.RecordedAt,
	)
	return err
}

func (r *pgAnalyticsRepository) GetOverview(ctx context.Context, workspaceID uuid.UUID) (*domain.AnalyticsOverview, error) {
	// Fetch the latest analytics row per platform for this workspace.
	const q = `
		SELECT DISTINCT ON (platform)
		    id, workspace_id, platform, followers_count, total_views, total_engagement, recorded_at
		FROM platform_analytics
		WHERE workspace_id = $1
		ORDER BY platform, recorded_at DESC`

	rows, err := r.pool.Query(ctx, q, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	overview := &domain.AnalyticsOverview{
		ByPlatform: make(map[string]*domain.PlatformAnalytics),
	}

	for rows.Next() {
		a := &domain.PlatformAnalytics{}
		if err := rows.Scan(&a.ID, &a.WorkspaceID, &a.Platform, &a.FollowersCount, &a.TotalViews, &a.TotalEngagement, &a.RecordedAt); err != nil {
			return nil, err
		}
		overview.TotalFollowers += a.FollowersCount
		overview.TotalViews += a.TotalViews
		overview.TotalEngagement += a.TotalEngagement
		overview.ByPlatform[string(a.Platform)] = a
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return overview, nil
}

func (r *pgAnalyticsRepository) GetContentAnalytics(ctx context.Context, contentID uuid.UUID, from, to time.Time) ([]*domain.ContentAnalyticsSummary, error) {
	// Content-level analytics are stored in the legacy content_analytics table (migration 000013).
	// Return empty slice for now — Phase 6 will populate per-post analytics from platform APIs.
	_ = from
	_ = to
	return []*domain.ContentAnalyticsSummary{}, nil
}

func (r *pgAnalyticsRepository) GetPlatformAnalytics(ctx context.Context, workspaceID uuid.UUID, platform domain.PlatformType, limit int) ([]*domain.PlatformAnalytics, error) {
	const q = `
		SELECT id, workspace_id, platform, followers_count, total_views, total_engagement, recorded_at
		FROM platform_analytics
		WHERE workspace_id = $1 AND platform = $2
		ORDER BY recorded_at DESC
		LIMIT $3`

	rows, err := r.pool.Query(ctx, q, workspaceID, platform, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*domain.PlatformAnalytics
	for rows.Next() {
		a := &domain.PlatformAnalytics{}
		if err := rows.Scan(&a.ID, &a.WorkspaceID, &a.Platform, &a.FollowersCount, &a.TotalViews, &a.TotalEngagement, &a.RecordedAt); err != nil {
			return nil, err
		}
		results = append(results, a)
	}
	return results, rows.Err()
}

var _ AnalyticsRepository = (*pgAnalyticsRepository)(nil)
