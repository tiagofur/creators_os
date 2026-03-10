package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
	"github.com/ordo/creators-os/internal/repository"
)

// TypeIdeaValidation is the task type identifier for idea AI validation.
const TypeIdeaValidation = "idea:validate"

// IdeaValidationPayload holds the data for an idea validation task.
type IdeaValidationPayload struct {
	IdeaID      string `json:"idea_id"`
	WorkspaceID string `json:"workspace_id"`
}

// NewIdeaValidationTask creates an asynq task for AI-based idea validation.
func NewIdeaValidationTask(ideaID, workspaceID string) (*asynq.Task, error) {
	payload, err := json.Marshal(IdeaValidationPayload{
		IdeaID:      ideaID,
		WorkspaceID: workspaceID,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal idea validation payload: %w", err)
	}
	return asynq.NewTask(TypeIdeaValidation, payload, asynq.Queue("default"), asynq.MaxRetry(3)), nil
}

// IdeaValidationHandler processes idea validation tasks using an injected IdeaRepository.
type IdeaValidationHandler struct {
	IdeaRepo repository.IdeaRepository
}

// HandleIdeaValidationTask processes an idea validation task.
// Phase 4 stub: generates fake scores (all 70s) and marks the idea as validated.
func (h *IdeaValidationHandler) HandleIdeaValidationTask(ctx context.Context, t *asynq.Task) error {
	var p IdeaValidationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal idea validation payload: %w", err)
	}

	slog.InfoContext(ctx, "AI validation stub for idea", "idea_id", p.IdeaID)

	ideaID, err := uuid.Parse(p.IdeaID)
	if err != nil {
		return fmt.Errorf("tasks: parse idea_id: %w", err)
	}

	reasoning := "Stub validation — all scores set to 70"
	score := &domain.IdeaValidationScore{
		NoveltyScore:     70,
		AudienceFitScore: 70,
		ViabilityScore:   70,
		UrgencyScore:     70,
		PersonalFitScore: 70,
		OverallScore:     70,
		AIReasoning:      &reasoning,
	}

	if err := h.IdeaRepo.SaveValidationScore(ctx, ideaID, score); err != nil {
		return fmt.Errorf("tasks: save validation score: %w", err)
	}

	// Update idea status to validated
	if err := h.IdeaRepo.UpdateStatus(ctx, ideaID, domain.IdeaStatusValidated); err != nil {
		slog.WarnContext(ctx, "failed to update idea status to validated", "idea_id", p.IdeaID, "err", err)
	}

	metrics.AsynqTasksTotal.WithLabelValues("default", "processed").Inc()
	return nil
}
