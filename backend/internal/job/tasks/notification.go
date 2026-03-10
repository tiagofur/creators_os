package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/metrics"
)

// TypeAssignmentNotification is the task type identifier for assignment notifications.
const TypeAssignmentNotification = "notification:assignment"

// AssignmentNotificationPayload holds the data for an assignment notification task.
type AssignmentNotificationPayload struct {
	ContentID string `json:"content_id"`
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
}

// NewAssignmentNotificationTask creates an asynq task for notifying an assigned user.
func NewAssignmentNotificationTask(contentID, userID, role string) (*asynq.Task, error) {
	payload, err := json.Marshal(AssignmentNotificationPayload{
		ContentID: contentID,
		UserID:    userID,
		Role:      role,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal assignment notification payload: %w", err)
	}
	return asynq.NewTask(TypeAssignmentNotification, payload, asynq.Queue("default"), asynq.MaxRetry(3)), nil
}

// HandleAssignmentNotificationTask processes an assignment notification task.
// Phase 4 stub: logs the assignment event.
func HandleAssignmentNotificationTask(ctx context.Context, t *asynq.Task) error {
	var p AssignmentNotificationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal assignment notification payload: %w", err)
	}

	slog.InfoContext(ctx, "assignment notification stub",
		"content_id", p.ContentID,
		"user_id", p.UserID,
		"role", p.Role,
	)

	metrics.AsynqTasksTotal.WithLabelValues("default", "processed").Inc()
	return nil
}
