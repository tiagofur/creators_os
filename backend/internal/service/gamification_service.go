package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

type gamificationService struct {
	repo     repository.GamificationRepository
	userRepo repository.UserRepository
	logger   *slog.Logger
}

// NewGamificationService creates a new GamificationService.
func NewGamificationService(repo repository.GamificationRepository, userRepo repository.UserRepository, logger *slog.Logger) GamificationService {
	if logger == nil {
		logger = slog.Default()
	}
	return &gamificationService{repo: repo, userRepo: userRepo, logger: logger}
}

// RecalculateConsistencyScore computes the user's current streak and publishing
// consistency score and persists it.
func (s *gamificationService) RecalculateConsistencyScore(ctx context.Context, userID, workspaceID uuid.UUID) error {
	publishedLast30, err := s.repo.GetRecentPublishedCount(ctx, userID, workspaceID, 30)
	if err != nil {
		return fmt.Errorf("gamification: get published count: %w", err)
	}

	// Simple scoring: score = min(100, published_count * 3 + streak_days)
	// For streak_days we use the user's current_streak from the users table.
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("gamification: get user: %w", err)
	}

	streakDays := user.CurrentStreak
	rawScore := publishedLast30*3 + streakDays
	if rawScore > 100 {
		rawScore = 100
	}

	score := &domain.ConsistencyScore{
		UserID:         userID,
		WorkspaceID:    workspaceID,
		Score:          rawScore,
		PublishedCount: publishedLast30,
		StreakDays:     streakDays,
		RecordedAt:     time.Now().UTC(),
	}

	return s.repo.InsertConsistencyScore(ctx, score)
}

// CheckAndUnlockAchievements evaluates all achievements against user_stats and
// unlocks any newly earned ones, awarding their points.
func (s *gamificationService) CheckAndUnlockAchievements(ctx context.Context, userID, workspaceID uuid.UUID) error {
	achievements, err := s.repo.ListAchievements(ctx)
	if err != nil {
		return fmt.Errorf("gamification: list achievements: %w", err)
	}

	stats, err := s.repo.GetUserStats(ctx, userID, workspaceID)
	if err != nil {
		// If stats don't exist yet, initialise them.
		stats = &domain.UserStats{
			UserID:      userID,
			WorkspaceID: workspaceID,
		}
	}

	unlockedSet := make(map[uuid.UUID]struct{})
	for _, id := range stats.AchievementsUnlocked {
		unlockedSet[id] = struct{}{}
	}

	newPoints := 0
	newUnlocked := []uuid.UUID{}

	for _, ach := range achievements {
		if _, already := unlockedSet[ach.ID]; already {
			continue
		}
		if s.meetsCriteria(ach.Criteria, stats) {
			newUnlocked = append(newUnlocked, ach.ID)
			newPoints += ach.Points
			s.logger.InfoContext(ctx, "achievement unlocked",
				"user_id", userID,
				"achievement", ach.Slug,
				"points", ach.Points,
			)
		}
	}

	if len(newUnlocked) == 0 {
		return nil
	}

	stats.AchievementsUnlocked = append(stats.AchievementsUnlocked, newUnlocked...)
	stats.TotalPoints += newPoints

	_, err = s.repo.UpsertUserStats(ctx, stats)
	return err
}

func (s *gamificationService) meetsCriteria(criteria map[string]any, stats *domain.UserStats) bool {
	for key, val := range criteria {
		threshold, ok := toInt64(val)
		if !ok {
			continue
		}
		switch key {
		case "published_count":
			if int64(stats.TotalPublished) < threshold {
				return false
			}
		case "streak_days":
			// streak_days is stored in consistency_scores; use published_count proxy here.
			if int64(stats.TotalPublished) < threshold {
				return false
			}
		}
	}
	return true
}

func toInt64(v any) (int64, bool) {
	switch n := v.(type) {
	case float64:
		return int64(n), true
	case int64:
		return n, true
	case int:
		return int64(n), true
	}
	return 0, false
}

func (s *gamificationService) GetLeaderboard(ctx context.Context, workspaceID uuid.UUID, limit int) ([]*domain.UserStats, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.repo.GetLeaderboard(ctx, workspaceID, limit)
}

func (s *gamificationService) GetMyStats(ctx context.Context, userID, workspaceID uuid.UUID) (*domain.UserStats, error) {
	stats, err := s.repo.GetUserStats(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}
	return stats, nil
}

func (s *gamificationService) ListAchievements(ctx context.Context) ([]*domain.Achievement, error) {
	return s.repo.ListAchievements(ctx)
}

var _ GamificationService = (*gamificationService)(nil)
