package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
)

type pgGamificationRepository struct {
	pool *pgxpool.Pool
}

// NewGamificationRepository creates a new GamificationRepository backed by the provided pool.
func NewGamificationRepository(pool *pgxpool.Pool) GamificationRepository {
	return &pgGamificationRepository{pool: pool}
}

func (r *pgGamificationRepository) UpsertUserStats(ctx context.Context, stats *domain.UserStats) (*domain.UserStats, error) {
	const q = `
		INSERT INTO user_stats (user_id, workspace_id, total_published, total_points, achievements_unlocked)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			total_published = EXCLUDED.total_published,
			total_points = EXCLUDED.total_points,
			achievements_unlocked = EXCLUDED.achievements_unlocked,
			updated_at = NOW()
		RETURNING id, user_id, workspace_id, total_published, total_points, achievements_unlocked, created_at, updated_at`

	s := &domain.UserStats{}
	err := r.pool.QueryRow(ctx, q,
		stats.UserID,
		stats.WorkspaceID,
		stats.TotalPublished,
		stats.TotalPoints,
		stats.AchievementsUnlocked,
	).Scan(
		&s.ID, &s.UserID, &s.WorkspaceID, &s.TotalPublished, &s.TotalPoints,
		&s.AchievementsUnlocked, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *pgGamificationRepository) GetUserStats(ctx context.Context, userID, workspaceID uuid.UUID) (*domain.UserStats, error) {
	const q = `
		SELECT id, user_id, workspace_id, total_published, total_points, achievements_unlocked, created_at, updated_at
		FROM user_stats
		WHERE user_id = $1 AND workspace_id = $2`

	s := &domain.UserStats{}
	err := r.pool.QueryRow(ctx, q, userID, workspaceID).Scan(
		&s.ID, &s.UserID, &s.WorkspaceID, &s.TotalPublished, &s.TotalPoints,
		&s.AchievementsUnlocked, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *pgGamificationRepository) GetLeaderboard(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*domain.UserStats, error) {
	const q = `
		SELECT id, user_id, workspace_id, total_published, total_points, achievements_unlocked, created_at, updated_at
		FROM user_stats
		WHERE workspace_id = $1
		ORDER BY total_points DESC
		LIMIT $2`

	rows, err := r.pool.Query(ctx, q, workspaceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.UserStats
	for rows.Next() {
		s := &domain.UserStats{}
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.WorkspaceID, &s.TotalPublished, &s.TotalPoints,
			&s.AchievementsUnlocked, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func (r *pgGamificationRepository) InsertConsistencyScore(ctx context.Context, score *domain.ConsistencyScore) error {
	const q = `
		INSERT INTO consistency_scores (user_id, workspace_id, score, published_count, streak_days, recorded_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, workspace_id, recorded_at) DO UPDATE SET
			score = EXCLUDED.score,
			published_count = EXCLUDED.published_count,
			streak_days = EXCLUDED.streak_days`

	_, err := r.pool.Exec(ctx, q,
		score.UserID,
		score.WorkspaceID,
		score.Score,
		score.PublishedCount,
		score.StreakDays,
		score.RecordedAt,
	)
	return err
}

func (r *pgGamificationRepository) ListAchievements(ctx context.Context) ([]*domain.Achievement, error) {
	const q = `SELECT id, slug, name, description, icon, criteria, points FROM achievements ORDER BY points ASC`

	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var achievements []*domain.Achievement
	for rows.Next() {
		a := &domain.Achievement{}
		var criteriaJSON []byte
		if err := rows.Scan(&a.ID, &a.Slug, &a.Name, &a.Description, &a.Icon, &criteriaJSON, &a.Points); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(criteriaJSON, &a.Criteria); err != nil {
			return nil, err
		}
		achievements = append(achievements, a)
	}
	return achievements, rows.Err()
}

func (r *pgGamificationRepository) GetRecentPublishedCount(ctx context.Context, userID, workspaceID uuid.UUID, days int) (int, error) {
	// Count published content assigned to this user in the last N days.
	const q = `
		SELECT COUNT(DISTINCT c.id)
		FROM contents c
		JOIN content_assignments ca ON ca.content_id = c.id
		WHERE ca.user_id = $1
		  AND c.workspace_id = $2
		  AND c.status = 'published'
		  AND c.updated_at >= NOW() - ($3 || ' days')::INTERVAL
		  AND c.deleted_at IS NULL`

	var count int
	err := r.pool.QueryRow(ctx, q, userID, workspaceID, days).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

var _ GamificationRepository = (*pgGamificationRepository)(nil)
