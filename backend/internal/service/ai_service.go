package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/ai"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

// aiService implements AIService.
type aiService struct {
	aiRouter    *ai.Router
	aiRepo      repository.AIRepository
	userRepo    repository.UserRepository
	contentRepo repository.ContentRepository
	logger      *slog.Logger
}

// NewAIService creates a new AIService with the required dependencies.
func NewAIService(
	aiRouter *ai.Router,
	aiRepo repository.AIRepository,
	userRepo repository.UserRepository,
	contentRepo repository.ContentRepository,
	logger *slog.Logger,
) AIService {
	if logger == nil {
		logger = slog.Default()
	}
	return &aiService{
		aiRouter:    aiRouter,
		aiRepo:      aiRepo,
		userRepo:    userRepo,
		contentRepo: contentRepo,
		logger:      logger,
	}
}

// CheckAndDeductCredits atomically deducts credits. Returns AI_002 (402) if insufficient.
func (s *aiService) CheckAndDeductCredits(ctx context.Context, userID uuid.UUID, cost int) error {
	return s.userRepo.DecrementAICredits(ctx, userID, cost)
}

// SendMessage streams the AI response into w, persisting both messages.
func (s *aiService) SendMessage(ctx context.Context, conversationID uuid.UUID, userID uuid.UUID, content string, w io.Writer) error {
	// Fetch conversation to verify ownership / existence
	_, err := s.aiRepo.GetConversation(ctx, conversationID)
	if err != nil {
		return fmt.Errorf("ai_service: get conversation: %w", err)
	}

	// Estimate token cost for the user message
	estimatedCost := s.aiRouter.EstimateTokens(content)
	if estimatedCost < 1 {
		estimatedCost = 1
	}

	// Deduct credits before calling the AI
	if err := s.CheckAndDeductCredits(ctx, userID, estimatedCost); err != nil {
		return err
	}

	// Persist the user message
	userMsg := &domain.AIMessage{
		ConversationID: conversationID,
		Role:           "user",
		Content:        content,
		TokensUsed:     estimatedCost,
	}
	if _, err := s.aiRepo.AddMessage(ctx, userMsg); err != nil {
		s.logger.WarnContext(ctx, "failed to persist user message", "err", err)
	}

	// Load conversation history for context
	history, err := s.aiRepo.ListMessages(ctx, conversationID)
	if err != nil {
		s.logger.WarnContext(ctx, "failed to load conversation history", "err", err)
	}

	// Build message list from history (excluding the just-saved user message,
	// which we'll pass as the final user turn)
	msgs := make([]ai.Message, 0, len(history))
	for _, m := range history {
		msgs = append(msgs, ai.Message{Role: m.Role, Content: m.Content})
	}

	req := ai.CompletionRequest{
		Messages:     msgs,
		SystemPrompt: "You are a helpful AI assistant for content creators.",
		MaxTokens:    2048,
	}

	// Capture streamed content for persistence
	captureWriter := &capturingWriter{underlying: w}
	if err := s.aiRouter.Stream(ctx, req, captureWriter); err != nil {
		return fmt.Errorf("ai_service: stream: %w", err)
	}

	// Persist the assistant message with actual token count
	actualOutputTokens := s.aiRouter.EstimateTokens(captureWriter.captured)
	modelName := s.aiRouter.Name()
	assistantMsg := &domain.AIMessage{
		ConversationID: conversationID,
		Role:           "assistant",
		Content:        captureWriter.captured,
		TokensUsed:     actualOutputTokens,
		Model:          &modelName,
	}
	if _, err := s.aiRepo.AddMessage(ctx, assistantMsg); err != nil {
		s.logger.WarnContext(ctx, "failed to persist assistant message", "err", err)
	}

	// Log discrepancy if actual tokens significantly exceed estimate
	if actualOutputTokens > estimatedCost*3 {
		s.logger.WarnContext(ctx, "token discrepancy: actual significantly exceeds estimate",
			"estimated", estimatedCost,
			"actual_output", actualOutputTokens,
		)
	}

	return nil
}

// Brainstorm returns a non-streaming brainstorm completion for the given topic.
func (s *aiService) Brainstorm(ctx context.Context, userID uuid.UUID, topic string) (string, error) {
	prompt := fmt.Sprintf("Brainstorm content ideas about: %s\n\nProvide 5 creative, engaging ideas.", topic)
	estimatedCost := s.aiRouter.EstimateTokens(prompt)
	if estimatedCost < 1 {
		estimatedCost = 1
	}

	if err := s.CheckAndDeductCredits(ctx, userID, estimatedCost); err != nil {
		return "", err
	}

	req := ai.CompletionRequest{
		Messages: []ai.Message{
			{Role: "user", Content: prompt},
		},
		SystemPrompt: "You are a creative content strategy assistant for content creators.",
		MaxTokens:    1024,
	}

	resp, err := s.aiRouter.Complete(ctx, req)
	if err != nil {
		return "", fmt.Errorf("ai_service: brainstorm: %w", err)
	}
	return resp.Content, nil
}

// GenerateScript returns a non-streaming script for the given title and description.
func (s *aiService) GenerateScript(ctx context.Context, userID uuid.UUID, title, description string) (string, error) {
	prompt := fmt.Sprintf("Write a detailed content script.\n\nTitle: %s\n\nDescription: %s\n\nInclude introduction, main sections, and a strong call-to-action.", title, description)
	estimatedCost := s.aiRouter.EstimateTokens(prompt)
	if estimatedCost < 1 {
		estimatedCost = 1
	}

	if err := s.CheckAndDeductCredits(ctx, userID, estimatedCost); err != nil {
		return "", err
	}

	req := ai.CompletionRequest{
		Messages: []ai.Message{
			{Role: "user", Content: prompt},
		},
		SystemPrompt: "You are an expert scriptwriter for digital content creators.",
		MaxTokens:    2048,
	}

	resp, err := s.aiRouter.Complete(ctx, req)
	if err != nil {
		return "", fmt.Errorf("ai_service: generate script: %w", err)
	}
	return resp.Content, nil
}

// AnalyzeScript returns AI-generated suggestions for improving a script.
func (s *aiService) AnalyzeScript(ctx context.Context, userID uuid.UUID, scriptText string) ([]domain.ScriptSuggestion, error) {
	prompt := fmt.Sprintf(`Analyze the following script and provide improvement suggestions. For each suggestion, return a JSON array of objects with these fields:
- id: a unique string id (e.g. "sug_01", "sug_02")
- type: one of "hook", "clarity", "cta", "pacing", "engagement"
- affected_text: the exact text from the script that should be improved
- suggested_improvement: your improved version of that text

Focus on:
1. Hook quality - Is the opening compelling enough to stop the scroll?
2. Clarity - Are there confusing or wordy sections?
3. CTA - Is the call-to-action clear and compelling?
4. Pacing - Does the script maintain good rhythm and energy?
5. Engagement - Are there missed opportunities for audience engagement?

Return ONLY a JSON array, no other text.

Script:
%s`, scriptText)

	estimatedCost := s.aiRouter.EstimateTokens(prompt)
	if estimatedCost < 1 {
		estimatedCost = 1
	}

	if err := s.CheckAndDeductCredits(ctx, userID, estimatedCost); err != nil {
		return nil, err
	}

	req := ai.CompletionRequest{
		Messages: []ai.Message{
			{Role: "user", Content: prompt},
		},
		SystemPrompt: "You are an expert script doctor for digital content creators. You analyze scripts for YouTube videos, podcasts, and other digital content, providing specific, actionable improvement suggestions. Always respond with valid JSON.",
		MaxTokens:    2048,
	}

	resp, err := s.aiRouter.Complete(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("ai_service: analyze script: %w", err)
	}

	// Parse the JSON response into suggestions
	var suggestions []domain.ScriptSuggestion
	if err := parseJSON(resp.Content, &suggestions); err != nil {
		s.logger.WarnContext(ctx, "failed to parse script doctor response as JSON, returning raw",
			"err", err,
			"raw", resp.Content,
		)
		// Return a single catch-all suggestion if parsing fails
		suggestions = []domain.ScriptSuggestion{
			{
				ID:                   "sug_01",
				Type:                 "clarity",
				AffectedText:         truncate(scriptText, 100),
				SuggestedImprovement: resp.Content,
			},
		}
	}

	return suggestions, nil
}

// Atomize takes a content item and generates platform-specific micro-content variations.
func (s *aiService) Atomize(ctx context.Context, userID, workspaceID, contentID uuid.UUID) (*domain.AtomizeResponse, error) {
	// Fetch the source content
	content, err := s.contentRepo.GetByID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("ai_service: atomize: fetch content: %w", err)
	}

	description := ""
	if content.Description != nil {
		description = *content.Description
	}

	prompt := fmt.Sprintf(`You are a content repurposing expert. Take the following content and create platform-specific micro-content variations.

Source Content:
Title: %s
Description/Script: %s
Content Type: %s

Generate variations for each of these platforms:
1. Twitter/X Thread (3-5 tweets)
2. Instagram Carousel (outline with slide-by-slide text)
3. TikTok Script (short-form hook + body + CTA)
4. LinkedIn Post (professional tone, storytelling)
5. Short-form Video Script (YouTube Shorts / Reels, under 60 seconds)

For each variation, return a JSON array of objects with these fields:
- platform: the platform name (e.g. "twitter", "instagram", "tiktok", "linkedin", "short_video")
- content_type: the format (e.g. "thread", "carousel", "script", "post", "short_script")
- title: a catchy title for this variation
- body: the full content text
- hooks: an opening hook line (optional)
- hashtags: an array of relevant hashtags (optional)

Return ONLY a valid JSON array, no other text.`, content.Title, description, string(content.ContentType))

	estimatedCost := s.aiRouter.EstimateTokens(prompt)
	if estimatedCost < 1 {
		estimatedCost = 1
	}

	if err := s.CheckAndDeductCredits(ctx, userID, estimatedCost); err != nil {
		return nil, err
	}

	req := ai.CompletionRequest{
		Messages: []ai.Message{
			{Role: "user", Content: prompt},
		},
		SystemPrompt: "You are an expert content repurposing strategist for digital creators. You transform long-form content into platform-optimized micro-content. Always respond with valid JSON.",
		MaxTokens:    2048,
	}

	resp, err := s.aiRouter.Complete(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("ai_service: atomize: %w", err)
	}

	var variations []domain.AtomizedContent
	if err := parseJSON(resp.Content, &variations); err != nil {
		s.logger.WarnContext(ctx, "failed to parse atomize response as JSON, returning raw",
			"err", err,
			"raw", resp.Content,
		)
		// Return a single catch-all variation if parsing fails
		variations = []domain.AtomizedContent{
			{
				Platform:    "general",
				ContentType: "post",
				Title:       content.Title,
				Body:        resp.Content,
			},
		}
	}

	return &domain.AtomizeResponse{
		SourceTitle: content.Title,
		Variations:  variations,
	}, nil
}

// GetCreditBalance returns the AI credit balance for the given user.
func (s *aiService) GetCreditBalance(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.userRepo.GetAICreditsBalance(ctx, userID)
}

// capturingWriter wraps an io.Writer and captures all written bytes for later use.
type capturingWriter struct {
	underlying io.Writer
	captured   string
}

func (cw *capturingWriter) Write(p []byte) (int, error) {
	cw.captured += string(p)
	return cw.underlying.Write(p)
}

// Flush implements http.Flusher if the underlying writer supports it.
func (cw *capturingWriter) Flush() {
	if f, ok := cw.underlying.(interface{ Flush() }); ok {
		f.Flush()
	}
}

// parseJSON attempts to parse a JSON string, stripping markdown code fences if present.
func parseJSON(raw string, v any) error {
	content := strings.TrimSpace(raw)
	// Strip markdown code fences if the LLM wrapped the response
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		// Remove first and last lines (``` markers)
		if len(lines) > 2 {
			lines = lines[1 : len(lines)-1]
		}
		content = strings.Join(lines, "\n")
		content = strings.TrimSpace(content)
	}
	return json.Unmarshal([]byte(content), v)
}

// truncate returns the first n characters of s, appending "..." if truncated.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// Ensure aiService implements AIService at compile time.
var _ AIService = (*aiService)(nil)
