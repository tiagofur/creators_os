package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/ai"
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

// IdeaValidationHandler processes idea validation tasks using an injected IdeaRepository and AI Router.
type IdeaValidationHandler struct {
	IdeaRepo repository.IdeaRepository
	AIRouter *ai.Router
}

// aiValidationResponse is the expected JSON structure from the AI model.
type aiValidationResponse struct {
	NoveltyScore     int    `json:"novelty_score"`
	AudienceFitScore int    `json:"audience_fit_score"`
	ViabilityScore   int    `json:"viability_score"`
	UrgencyScore     int    `json:"urgency_score"`
	PersonalFitScore int    `json:"personal_fit_score"`
	Reasoning        string `json:"reasoning"`
}

// HandleIdeaValidationTask processes an idea validation task.
// It uses AI to evaluate the idea across 5 dimensions, falling back to stub scores if AI fails.
func (h *IdeaValidationHandler) HandleIdeaValidationTask(ctx context.Context, t *asynq.Task) error {
	var p IdeaValidationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal idea validation payload: %w", err)
	}

	ideaID, err := uuid.Parse(p.IdeaID)
	if err != nil {
		return fmt.Errorf("tasks: parse idea_id: %w", err)
	}

	// Attempt AI-powered validation; fall back to stub on any failure.
	score, err := h.validateWithAI(ctx, ideaID)
	if err != nil {
		slog.WarnContext(ctx, "AI validation failed, falling back to stub scores",
			"idea_id", p.IdeaID, "err", err)
		score = stubValidationScore()
	} else {
		slog.InfoContext(ctx, "AI validation completed for idea", "idea_id", p.IdeaID)
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

// validateWithAI fetches the idea and calls the AI router for scoring.
func (h *IdeaValidationHandler) validateWithAI(ctx context.Context, ideaID uuid.UUID) (*domain.IdeaValidationScore, error) {
	if h.AIRouter == nil {
		return nil, fmt.Errorf("AI router not configured")
	}

	// Fetch the idea details for the prompt.
	idea, err := h.IdeaRepo.GetByID(ctx, ideaID)
	if err != nil {
		return nil, fmt.Errorf("fetch idea: %w", err)
	}

	prompt := buildValidationPrompt(idea)

	req := ai.CompletionRequest{
		Messages: []ai.Message{
			{Role: "user", Content: prompt},
		},
		SystemPrompt: "You are an expert content strategy analyst. Evaluate content ideas for creators and return ONLY valid JSON, no other text.",
		MaxTokens:    1024,
	}

	resp, err := h.AIRouter.Complete(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("AI complete: %w", err)
	}

	// Parse the JSON response.
	var valResp aiValidationResponse
	if err := parseValidationJSON(resp.Content, &valResp); err != nil {
		return nil, fmt.Errorf("parse AI response: %w", err)
	}

	// Clamp scores to 0-100.
	clamp := func(v int) int {
		if v < 0 {
			return 0
		}
		if v > 100 {
			return 100
		}
		return v
	}

	novelty := clamp(valResp.NoveltyScore)
	audience := clamp(valResp.AudienceFitScore)
	viability := clamp(valResp.ViabilityScore)
	urgency := clamp(valResp.UrgencyScore)
	personal := clamp(valResp.PersonalFitScore)
	overall := (novelty + audience + viability + urgency + personal) / 5

	reasoning := valResp.Reasoning

	return &domain.IdeaValidationScore{
		NoveltyScore:     novelty,
		AudienceFitScore: audience,
		ViabilityScore:   viability,
		UrgencyScore:     urgency,
		PersonalFitScore: personal,
		OverallScore:     overall,
		AIReasoning:      &reasoning,
	}, nil
}

// buildValidationPrompt constructs the AI prompt from the idea details.
func buildValidationPrompt(idea *domain.Idea) string {
	var sb strings.Builder
	sb.WriteString("Evaluate the following content idea across 5 dimensions, each scored 0-100.\n\n")
	sb.WriteString(fmt.Sprintf("Title: %s\n", idea.Title))

	if idea.Description != nil && *idea.Description != "" {
		sb.WriteString(fmt.Sprintf("Description: %s\n", *idea.Description))
	}

	if idea.PlatformTarget != nil {
		sb.WriteString(fmt.Sprintf("Platform: %s\n", string(*idea.PlatformTarget)))
	}

	if len(idea.Tags) > 0 {
		sb.WriteString(fmt.Sprintf("Tags: %s\n", strings.Join(idea.Tags, ", ")))
	}

	sb.WriteString(`
Score each dimension from 0 to 100:
- novelty_score: How original and fresh is this idea?
- audience_fit_score: How well does it match the target audience and platform?
- viability_score: How feasible is it to produce this content?
- urgency_score: How timely or trending is this topic?
- personal_fit_score: How well does it fit a typical creator's strengths?

Return ONLY a JSON object with these fields:
{
  "novelty_score": <int>,
  "audience_fit_score": <int>,
  "viability_score": <int>,
  "urgency_score": <int>,
  "personal_fit_score": <int>,
  "reasoning": "<brief explanation of the scores>"
}`)

	return sb.String()
}

// parseValidationJSON attempts to parse a JSON string, stripping markdown code fences if present.
func parseValidationJSON(raw string, v any) error {
	content := strings.TrimSpace(raw)
	// Strip markdown code fences if the LLM wrapped the response
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		if len(lines) > 2 {
			lines = lines[1 : len(lines)-1]
		}
		content = strings.Join(lines, "\n")
		content = strings.TrimSpace(content)
	}
	return json.Unmarshal([]byte(content), v)
}

// stubValidationScore returns the fallback stub scores (all 70s).
func stubValidationScore() *domain.IdeaValidationScore {
	reasoning := "Stub validation — AI unavailable, all scores set to 70"
	return &domain.IdeaValidationScore{
		NoveltyScore:     70,
		AudienceFitScore: 70,
		ViabilityScore:   70,
		UrgencyScore:     70,
		PersonalFitScore: 70,
		OverallScore:     70,
		AIReasoning:      &reasoning,
	}
}
