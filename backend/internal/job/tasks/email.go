package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/metrics"
)

// Task type constants.
const (
	TypeEmailVerification = "email:verification"
	TypePasswordReset     = "email:password_reset"
	TypeInvitation        = "email:invitation"
)

// emailVerificationPayload holds the data for an email verification task.
type emailVerificationPayload struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Token  string `json:"token"`
}

// passwordResetPayload holds the data for a password reset task.
type passwordResetPayload struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Token  string `json:"token"`
}

// NewEmailVerificationTask creates an asynq task for sending a verification email.
func NewEmailVerificationTask(userID, email, token string) (*asynq.Task, error) {
	payload, err := json.Marshal(emailVerificationPayload{
		UserID: userID,
		Email:  email,
		Token:  token,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal email verification payload: %w", err)
	}
	return asynq.NewTask(TypeEmailVerification, payload, asynq.Queue("default"), asynq.MaxRetry(3)), nil
}

// NewPasswordResetTask creates an asynq task for sending a password reset email.
func NewPasswordResetTask(userID, email, token string) (*asynq.Task, error) {
	payload, err := json.Marshal(passwordResetPayload{
		UserID: userID,
		Email:  email,
		Token:  token,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal password reset payload: %w", err)
	}
	return asynq.NewTask(TypePasswordReset, payload, asynq.Queue("default"), asynq.MaxRetry(3)), nil
}

// HandleEmailVerificationTask processes an email verification task.
// In development, logs the email rather than sending via SMTP (mailhog stub).
func HandleEmailVerificationTask(ctx context.Context, t *asynq.Task) error {
	var p emailVerificationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal email verification payload: %w", err)
	}

	// TODO: replace with real SMTP / mailhog integration
	slog.InfoContext(ctx, "sending email verification",
		"user_id", p.UserID,
		"email", p.Email,
		"token_prefix", safePrefix(p.Token, 8),
	)

	metrics.AsynqTasksTotal.WithLabelValues("default", "processed").Inc()
	return nil
}

// HandlePasswordResetTask processes a password reset email task.
func HandlePasswordResetTask(ctx context.Context, t *asynq.Task) error {
	var p passwordResetPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal password reset payload: %w", err)
	}

	// TODO: replace with real SMTP / mailhog integration
	slog.InfoContext(ctx, "sending password reset email",
		"user_id", p.UserID,
		"email", p.Email,
		"token_prefix", safePrefix(p.Token, 8),
	)

	metrics.AsynqTasksTotal.WithLabelValues("default", "processed").Inc()
	return nil
}

// invitationPayload holds the data for a workspace invitation email task.
type invitationPayload struct {
	WorkspaceID string `json:"workspace_id"`
	InviterID   string `json:"inviter_id"`
	Email       string `json:"email"`
	Token       string `json:"token"`
}

// NewInvitationTask creates an asynq task for sending a workspace invitation email.
func NewInvitationTask(workspaceID, inviterID, email, token string) (*asynq.Task, error) {
	payload, err := json.Marshal(invitationPayload{
		WorkspaceID: workspaceID,
		InviterID:   inviterID,
		Email:       email,
		Token:       token,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal invitation payload: %w", err)
	}
	return asynq.NewTask(TypeInvitation, payload, asynq.Queue("default"), asynq.MaxRetry(3)), nil
}

// HandleInvitationTask processes a workspace invitation email task.
func HandleInvitationTask(ctx context.Context, t *asynq.Task) error {
	var p invitationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal invitation payload: %w", err)
	}

	// TODO: replace with real SMTP / mailhog integration
	slog.InfoContext(ctx, "sending workspace invitation email",
		"workspace_id", p.WorkspaceID,
		"inviter_id", p.InviterID,
		"email", p.Email,
		"token_prefix", safePrefix(p.Token, 8),
	)

	metrics.AsynqTasksTotal.WithLabelValues("default", "processed").Inc()
	return nil
}

// safePrefix returns the first n characters of s, or s if shorter.
func safePrefix(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
