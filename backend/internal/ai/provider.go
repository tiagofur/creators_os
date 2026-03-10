package ai

import (
	"context"
	"io"
)

// Message represents a single message in a conversation.
type Message struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"`
}

// CompletionRequest holds the parameters for an AI completion call.
type CompletionRequest struct {
	Messages     []Message
	SystemPrompt string
	MaxTokens    int
}

// CompletionResponse holds the result of an AI completion call.
type CompletionResponse struct {
	Content      string
	InputTokens  int
	OutputTokens int
	Model        string
}

// AIProvider defines the interface for AI model backends.
type AIProvider interface {
	// Name returns a short identifier for this provider.
	Name() string
	// Complete sends a request to the AI model and returns the full response.
	Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error)
	// Stream sends a request to the AI model and streams the response to w.
	// It writes SSE-formatted chunks and ends with "data: [DONE]\n\n".
	Stream(ctx context.Context, req CompletionRequest, w io.Writer) error
	// EstimateTokens returns a rough token count estimate for the given content.
	EstimateTokens(content string) int
}
