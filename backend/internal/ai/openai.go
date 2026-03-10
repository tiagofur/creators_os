package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	openAIDefaultModel  = "gpt-4o"
	openAIAPIBaseURL    = "https://api.openai.com/v1"
	openAIDefaultMaxTok = 4096
)

// openAIProvider implements AIProvider using the OpenAI Chat Completions API
// via direct HTTP calls.
type openAIProvider struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

// NewOpenAIProvider creates a new OpenAI AI provider.
func NewOpenAIProvider(apiKey, model string) AIProvider {
	if model == "" {
		model = openAIDefaultModel
	}
	return &openAIProvider{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// Name returns the provider identifier.
func (o *openAIProvider) Name() string { return "openai" }

// EstimateTokens gives a rough token count (chars / 4).
func (o *openAIProvider) EstimateTokens(content string) int {
	return len(content) / 4
}

// openAIMessage is the wire format for OpenAI Chat Completions.
type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// openAIRequest is the request body for POST /v1/chat/completions.
type openAIRequest struct {
	Model     string          `json:"model"`
	Messages  []openAIMessage `json:"messages"`
	MaxTokens int             `json:"max_tokens,omitempty"`
	Stream    bool            `json:"stream,omitempty"`
}

// openAIChoice is a single completion choice.
type openAIChoice struct {
	Message openAIMessage `json:"message"`
}

// openAIUsage holds token usage info.
type openAIUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

// openAIResponse is the response body from POST /v1/chat/completions.
type openAIResponse struct {
	ID      string         `json:"id"`
	Model   string         `json:"model"`
	Choices []openAIChoice `json:"choices"`
	Usage   openAIUsage    `json:"usage"`
}

// openAIDelta holds a streaming delta chunk.
type openAIDelta struct {
	Content string `json:"content"`
}

// openAIStreamChoice holds a streaming choice delta.
type openAIStreamChoice struct {
	Delta openAIDelta `json:"delta"`
}

// openAIStreamChunk is a single SSE data payload from OpenAI streaming.
type openAIStreamChunk struct {
	Choices []openAIStreamChoice `json:"choices"`
}

// openAIErrorDetail holds the error message from OpenAI.
type openAIErrorDetail struct {
	Message string `json:"message"`
	Type    string `json:"type"`
}

// openAIErrorResponse is the error body from the OpenAI API.
type openAIErrorResponse struct {
	Error openAIErrorDetail `json:"error"`
}

// Complete sends a synchronous completion request to OpenAI.
func (o *openAIProvider) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	maxTok := req.MaxTokens
	if maxTok <= 0 {
		maxTok = openAIDefaultMaxTok
	}

	msgs := make([]openAIMessage, 0, len(req.Messages)+1)
	if req.SystemPrompt != "" {
		msgs = append(msgs, openAIMessage{Role: "system", Content: req.SystemPrompt})
	}
	for _, m := range req.Messages {
		msgs = append(msgs, openAIMessage{Role: m.Role, Content: m.Content})
	}

	body := openAIRequest{
		Model:     o.model,
		Messages:  msgs,
		MaxTokens: maxTok,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("openai: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIAPIBaseURL+"/chat/completions", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("openai: build request: %w", err)
	}
	o.setHeaders(httpReq)

	resp, err := o.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProviderUnavailable, err)
	}
	defer resp.Body.Close()

	if err := o.checkStatus(resp); err != nil {
		return nil, err
	}

	var cr openAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, fmt.Errorf("openai: decode response: %w", err)
	}

	content := ""
	if len(cr.Choices) > 0 {
		content = cr.Choices[0].Message.Content
	}

	return &CompletionResponse{
		Content:      content,
		InputTokens:  cr.Usage.PromptTokens,
		OutputTokens: cr.Usage.CompletionTokens,
		Model:        cr.Model,
	}, nil
}

// Stream sends a streaming request to OpenAI and writes SSE data chunks to w.
func (o *openAIProvider) Stream(ctx context.Context, req CompletionRequest, w io.Writer) error {
	maxTok := req.MaxTokens
	if maxTok <= 0 {
		maxTok = openAIDefaultMaxTok
	}

	msgs := make([]openAIMessage, 0, len(req.Messages)+1)
	if req.SystemPrompt != "" {
		msgs = append(msgs, openAIMessage{Role: "system", Content: req.SystemPrompt})
	}
	for _, m := range req.Messages {
		msgs = append(msgs, openAIMessage{Role: m.Role, Content: m.Content})
	}

	body := openAIRequest{
		Model:     o.model,
		Messages:  msgs,
		MaxTokens: maxTok,
		Stream:    true,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("openai: marshal stream request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIAPIBaseURL+"/chat/completions", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("openai: build stream request: %w", err)
	}
	o.setHeaders(httpReq)

	resp, err := o.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrProviderUnavailable, err)
	}
	defer resp.Body.Close()

	if err := o.checkStatus(resp); err != nil {
		return err
	}

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		chunk := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if chunk == "[DONE]" {
			break
		}

		var sc openAIStreamChunk
		if err := json.Unmarshal([]byte(chunk), &sc); err != nil {
			continue
		}

		for _, choice := range sc.Choices {
			if choice.Delta.Content != "" {
				payload, _ := json.Marshal(map[string]string{"content": choice.Delta.Content})
				_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("openai: stream scan: %w", err)
	}

	_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	return nil
}

// setHeaders applies the required OpenAI API headers.
func (o *openAIProvider) setHeaders(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+o.apiKey)
	req.Header.Set("Content-Type", "application/json")
}

// checkStatus maps non-2xx HTTP responses to typed errors.
func (o *openAIProvider) checkStatus(resp *http.Response) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		return ErrRateLimited
	}
	if resp.StatusCode >= 500 {
		return fmt.Errorf("%w: status %d", ErrProviderUnavailable, resp.StatusCode)
	}

	var errResp openAIErrorResponse
	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &errResp); err == nil && errResp.Error.Message != "" {
		return fmt.Errorf("openai: api error %d: %s", resp.StatusCode, errResp.Error.Message)
	}
	return fmt.Errorf("openai: api error %d", resp.StatusCode)
}
