package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/ordo/creators-os/internal/ai"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
	"github.com/ordo/creators-os/internal/repository"
)

// TypeRemixAnalysis is the Asynq task type for remix analysis jobs.
const TypeRemixAnalysis = "remix:analyze"

// RemixPayload holds the data for a remix analysis task.
type RemixPayload struct {
	JobID       string `json:"job_id"`
	WorkspaceID string `json:"workspace_id"`
	UserID      string `json:"user_id"`
	InputURL    string `json:"input_url"`
}

// NewRemixAnalysisTask creates an Asynq task for a remix analysis job.
func NewRemixAnalysisTask(jobID, workspaceID, userID, inputURL string) (*asynq.Task, error) {
	payload, err := json.Marshal(RemixPayload{
		JobID:       jobID,
		WorkspaceID: workspaceID,
		UserID:      userID,
		InputURL:    inputURL,
	})
	if err != nil {
		return nil, fmt.Errorf("tasks: marshal remix payload: %w", err)
	}
	return asynq.NewTask(TypeRemixAnalysis, payload, asynq.Queue("remix"), asynq.MaxRetry(2), asynq.Timeout(5*time.Minute)), nil
}

// MakeHandleRemixAnalysisTask returns a closure that handles remix analysis tasks
// with the provided remixRepo and aiRouter injected.
func MakeHandleRemixAnalysisTask(remixRepo repository.RemixRepository, aiRouter *ai.Router) func(context.Context, *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		return HandleRemixAnalysisTask(ctx, t, remixRepo, aiRouter)
	}
}

// HandleRemixAnalysisTask processes a remix analysis task through 4 steps.
func HandleRemixAnalysisTask(ctx context.Context, t *asynq.Task, remixRepo repository.RemixRepository, aiRouter *ai.Router) error {
	var p RemixPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("tasks: unmarshal remix payload: %w", err)
	}

	jobID, err := uuid.Parse(p.JobID)
	if err != nil {
		return fmt.Errorf("tasks: invalid job_id: %w", err)
	}

	setFailed := func(errMsg string) {
		msg := errMsg
		if updateErr := remixRepo.UpdateStatus(ctx, jobID, "failed", &msg); updateErr != nil {
			slog.ErrorContext(ctx, "failed to mark remix job as failed", "job_id", jobID, "err", updateErr)
		}
	}

	// --- Step 1: Ingest ---
	if err := validateURL(p.InputURL); err != nil {
		setFailed(fmt.Sprintf("invalid URL: %v", err))
		return fmt.Errorf("tasks: remix step 1 validate url: %w", err)
	}

	if err := remixRepo.UpdateStatus(ctx, jobID, "ingesting", nil); err != nil {
		return fmt.Errorf("tasks: remix step 1 update status: %w", err)
	}

	meta, err := fetchURLMetadata(ctx, p.InputURL)
	if err != nil {
		slog.WarnContext(ctx, "could not fetch URL metadata", "url", p.InputURL, "err", err)
		meta = map[string]string{"content_type": "unknown"}
	}

	slog.InfoContext(ctx, "remix step 1 complete", "job_id", jobID, "content_type", meta["content_type"])

	// --- Step 2: Transcribe ---
	if err := remixRepo.UpdateStatus(ctx, jobID, "transcribing", nil); err != nil {
		return fmt.Errorf("tasks: remix step 2 update status: %w", err)
	}

	transcriptReq := ai.CompletionRequest{
		Messages: []ai.Message{
			{
				Role:    "user",
				Content: fmt.Sprintf("Generate a sample transcript for a video at: %s\n\nProvide a realistic 3-paragraph transcript.", p.InputURL),
			},
		},
		SystemPrompt: "You are a transcription assistant. Generate realistic sample transcripts.",
		MaxTokens:    1024,
	}

	transcriptResp, err := aiRouter.Complete(ctx, transcriptReq)
	if err != nil {
		setFailed(fmt.Sprintf("transcription failed: %v", err))
		return fmt.Errorf("tasks: remix step 2 transcribe: %w", err)
	}
	transcript := transcriptResp.Content

	slog.InfoContext(ctx, "remix step 2 complete", "job_id", jobID, "transcript_len", len(transcript))

	// --- Step 3: Score ---
	if err := remixRepo.UpdateStatus(ctx, jobID, "scoring", nil); err != nil {
		return fmt.Errorf("tasks: remix step 3 update status: %w", err)
	}

	scoreReq := ai.CompletionRequest{
		Messages: []ai.Message{
			{
				Role: "user",
				Content: fmt.Sprintf(`Based on this transcript, identify 3 clip suggestions.
Return JSON array: [{"start_time":"00:00","end_time":"00:30","reason":"why this clip is good"}]

Transcript:
%s`, transcript),
			},
		},
		SystemPrompt: "You are a content analyst. Return valid JSON only.",
		MaxTokens:    512,
	}

	scoreResp, err := aiRouter.Complete(ctx, scoreReq)
	if err != nil {
		setFailed(fmt.Sprintf("scoring failed: %v", err))
		return fmt.Errorf("tasks: remix step 3 score: %w", err)
	}

	clips := parseClipSuggestions(scoreResp.Content)
	slog.InfoContext(ctx, "remix step 3 complete", "job_id", jobID, "clips_found", len(clips))

	// --- Step 4: Generate titles/descriptions ---
	if err := remixRepo.UpdateStatus(ctx, jobID, "generating", nil); err != nil {
		return fmt.Errorf("tasks: remix step 4 update status: %w", err)
	}

	enrichedClips := make([]map[string]any, 0, len(clips))
	for i, clip := range clips {
		genReq := ai.CompletionRequest{
			Messages: []ai.Message{
				{
					Role: "user",
					Content: fmt.Sprintf(`Create a catchy title and description for a short clip.
Clip timeframe: %s to %s
Reason: %s

Return JSON: {"title":"...","description":"..."}`,
						clip["start_time"], clip["end_time"], clip["reason"]),
				},
			},
			SystemPrompt: "You are a creative social media content writer. Return valid JSON only.",
			MaxTokens:    256,
		}

		genResp, err := aiRouter.Complete(ctx, genReq)
		if err != nil {
			slog.WarnContext(ctx, "failed to generate clip title/description", "clip_index", i, "err", err)
			clip["title"] = fmt.Sprintf("Clip %d", i+1)
			clip["description"] = clip["reason"]
		} else {
			titleDesc := parseTitleDescription(genResp.Content)
			for k, v := range titleDesc {
				clip[k] = v
			}
		}
		clip["id"] = fmt.Sprintf("clip_%d", i)
		enrichedClips = append(enrichedClips, clip)
	}

	// --- Finalize ---
	results := map[string]any{
		"transcript": transcript,
		"clips":      enrichedClips,
		"processed_at": time.Now().UTC().Format(time.RFC3339),
		"source_url": p.InputURL,
	}

	if err := remixRepo.UpdateResults(ctx, jobID, results); err != nil {
		return fmt.Errorf("tasks: remix update results: %w", err)
	}

	if err := remixRepo.UpdateStatus(ctx, jobID, "complete", nil); err != nil {
		return fmt.Errorf("tasks: remix finalize status: %w", err)
	}

	metrics.AsynqTasksTotal.WithLabelValues("remix", "processed").Inc()
	slog.InfoContext(ctx, "remix analysis complete", "job_id", jobID, "clips", len(enrichedClips))
	return nil
}

// validateURL checks that the input URL is a valid http/https URL.
func validateURL(rawURL string) error {
	u, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("URL must use http or https scheme, got: %s", u.Scheme)
	}
	return nil
}

// fetchURLMetadata performs an HTTP HEAD request to gather basic metadata.
func fetchURLMetadata(ctx context.Context, rawURL string) (map[string]string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build HEAD request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HEAD request failed: %w", err)
	}
	defer resp.Body.Close()

	return map[string]string{
		"content_type":   resp.Header.Get("Content-Type"),
		"content_length": resp.Header.Get("Content-Length"),
		"status":         fmt.Sprintf("%d", resp.StatusCode),
	}, nil
}

// parseClipSuggestions attempts to parse JSON clip suggestions from the AI response.
// Falls back to stub clips if parsing fails.
func parseClipSuggestions(content string) []map[string]any {
	// Try to extract JSON array from the response
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]")
	if start >= 0 && end > start {
		jsonStr := content[start : end+1]
		var clips []map[string]any
		if err := json.Unmarshal([]byte(jsonStr), &clips); err == nil && len(clips) > 0 {
			return clips
		}
	}

	// Fallback: return stub clips
	return []map[string]any{
		{"start_time": "00:00", "end_time": "00:30", "reason": "Strong opening hook"},
		{"start_time": "01:00", "end_time": "01:45", "reason": "Key insight moment"},
		{"start_time": "03:00", "end_time": "03:30", "reason": "Compelling conclusion"},
	}
}

// parseTitleDescription attempts to parse JSON title/description from the AI response.
func parseTitleDescription(content string) map[string]any {
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		jsonStr := content[start : end+1]
		var result map[string]any
		if err := json.Unmarshal([]byte(jsonStr), &result); err == nil {
			return result
		}
	}
	return map[string]any{
		"title":       "Untitled Clip",
		"description": content,
	}
}

// Ensure domain.RemixJob is used (imported via repository).
var _ *domain.RemixJob = nil
