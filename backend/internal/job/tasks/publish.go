package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/repository"
)

const TypePublishPost = "publish:post"

// PublishPayload holds the data required to publish a scheduled post.
type PublishPayload struct {
	PostID      string `json:"post_id"`
	Platform    string `json:"platform"`
	WorkspaceID string `json:"workspace_id"`
}

// NewPublishTask creates an asynq task for publishing a scheduled post.
func NewPublishTask(postID, platform, workspaceID string) (*asynq.Task, error) {
	payload, err := json.Marshal(PublishPayload{
		PostID:      postID,
		Platform:    platform,
		WorkspaceID: workspaceID,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal publish payload: %w", err)
	}
	return asynq.NewTask(TypePublishPost, payload, asynq.Queue("default"), asynq.MaxRetry(3)), nil
}

// NewPublishTaskHandler returns a HandlePublishTask function bound to the provided DB pool.
func NewPublishTaskHandler(pool *pgxpool.Pool) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		return HandlePublishTask(ctx, t, pool)
	}
}

// HandlePublishTask processes a publish:post task.
// Stub implementation: loads the scheduled post, logs the publishing action,
// and updates the post status to "published".
// Real platform API calls are deferred to Phase 6.
func HandlePublishTask(ctx context.Context, t *asynq.Task, pool *pgxpool.Pool) error {
	var p PublishPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal publish payload: %w", err)
	}

	postID, err := uuid.Parse(p.PostID)
	if err != nil {
		return fmt.Errorf("tasks: invalid post_id %q: %w", p.PostID, err)
	}

	repo := repository.NewPublishingRepository(pool)

	post, err := repo.GetScheduledPost(ctx, postID)
	if err != nil {
		return fmt.Errorf("tasks: get scheduled post: %w", err)
	}

	slog.InfoContext(ctx, "Publishing to platform",
		"platform", post.Platform,
		"post_id", post.ID,
		"workspace_id", post.WorkspaceID,
	)

	// Stub: mark as published immediately.
	now := time.Now().UTC().Format(time.RFC3339)
	if err := repo.UpdatePostStatus(ctx, post.ID, "published", &now, nil); err != nil {
		return fmt.Errorf("tasks: update post status: %w", err)
	}

	return nil
}

// HandlePublishScheduler is called by the Asynq scheduler every minute.
// It queries for due posts and enqueues a publish task for each one.
func HandlePublishScheduler(ctx context.Context, t *asynq.Task, pool *pgxpool.Pool, client *asynq.Client) error {
	repo := repository.NewPublishingRepository(pool)
	posts, err := repo.GetDuePosts(ctx, time.Now())
	if err != nil {
		return fmt.Errorf("tasks: get due posts: %w", err)
	}

	for _, post := range posts {
		task, err := NewPublishTask(post.ID.String(), string(post.Platform), post.WorkspaceID.String())
		if err != nil {
			slog.WarnContext(ctx, "failed to create publish task", "post_id", post.ID, "err", err)
			continue
		}
		if _, err := client.EnqueueContext(ctx, task); err != nil {
			slog.WarnContext(ctx, "failed to enqueue publish task", "post_id", post.ID, "err", err)
		}
	}

	return nil
}
