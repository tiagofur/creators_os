package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const (
	claudeDefaultModel  = "claude-opus-4-6"
	claudeAPIBaseURL    = "https://api.anthropic.com/v1"
	claudeAPIVersion    = "2023-06-01"
	claudeDefaultMaxTok = 4096
)

// claudeProvider implements AIProvider using the Anthropic Messages API via
// direct HTTP calls (no SDK dependency).
type claudeProvider struct {
	apiKey     string
	model      string
	httpClient *http.Client
	logger     *slog.Logger
}

// NewClaudeProvider creates a new Anthropic Claude AI provider.
func NewClaudeProvider(apiKey, model string) AIProvider {
	if model == "" {
		model = claudeDefaultModel
	}
	return &claudeProvider{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
		logger: slog.Default(),
	}
}

// Name returns the provider identifier.
func (c *claudeProvider) Name() string { return "claude" }

// EstimateTokens gives a rough token count (chars / 4).
func (c *claudeProvider) EstimateTokens(content string) int {
	return len(content) / 4
}

// claudeMessage is the wire format for Anthropic Messages API.
type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// claudeRequest is the request body for POST /v1/messages.
type claudeRequest struct {
	Model     string          `json:"model"`
	Messages  []claudeMessage `json:"messages"`
	System    string          `json:"system,omitempty"`
	MaxTokens int             `json:"max_tokens"`
	Stream    bool            `json:"stream,omitempty"`
}

// claudeContentBlock represents a content block in the response.
type claudeContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// claudeUsage holds token usage info from the response.
type claudeUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// claudeResponse is the response body from POST /v1/messages.
type claudeResponse struct {
	ID      string               `json:"id"`
	Model   string               `json:"model"`
	Content []claudeContentBlock `json:"content"`
	Usage   claudeUsage          `json:"usage"`
}

// claudeErrorResponse is the error body from the Anthropic API.
type claudeErrorBody struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}
type claudeErrorResponse struct {
	Type  string          `json:"type"`
	Error claudeErrorBody `json:"error"`
}

// Complete sends a synchronous completion request to Claude.
func (c *claudeProvider) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	maxTok := req.MaxTokens
	if maxTok <= 0 {
		maxTok = claudeDefaultMaxTok
	}

	msgs := make([]claudeMessage, len(req.Messages))
	for i, m := range req.Messages {
		msgs[i] = claudeMessage{Role: m.Role, Content: m.Content}
	}

	body := claudeRequest{
		Model:     c.model,
		Messages:  msgs,
		System:    req.SystemPrompt,
		MaxTokens: maxTok,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("claude: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, claudeAPIBaseURL+"/messages", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("claude: build request: %w", err)
	}
	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProviderUnavailable, err)
	}
	defer resp.Body.Close()

	if err := c.checkStatus(resp); err != nil {
		return nil, err
	}

	var cr claudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, fmt.Errorf("claude: decode response: %w", err)
	}

	content := ""
	for _, block := range cr.Content {
		if block.Type == "text" {
			content += block.Text
		}
	}

	return &CompletionResponse{
		Content:      content,
		InputTokens:  cr.Usage.InputTokens,
		OutputTokens: cr.Usage.OutputTokens,
		Model:        cr.Model,
	}, nil
}

// Stream sends a streaming request to Claude and writes SSE data chunks to w.
func (c *claudeProvider) Stream(ctx context.Context, req CompletionRequest, w io.Writer) error {
	maxTok := req.MaxTokens
	if maxTok <= 0 {
		maxTok = claudeDefaultMaxTok
	}

	msgs := make([]claudeMessage, len(req.Messages))
	for i, m := range req.Messages {
		msgs[i] = claudeMessage{Role: m.Role, Content: m.Content}
	}

	body := claudeRequest{
		Model:     c.model,
		Messages:  msgs,
		System:    req.SystemPrompt,
		MaxTokens: maxTok,
		Stream:    true,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("claude: marshal stream request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, claudeAPIBaseURL+"/messages", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("claude: build stream request: %w", err)
	}
	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrProviderUnavailable, err)
	}
	defer resp.Body.Close()

	if err := c.checkStatus(resp); err != nil {
		return err
	}

	// Parse SSE stream
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

		// Parse the SSE event JSON to extract delta text
		var event struct {
			Type  string `json:"type"`
			Delta *struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"delta"`
		}
		if err := json.Unmarshal([]byte(chunk), &event); err != nil {
			continue
		}

		if event.Type == "content_block_delta" && event.Delta != nil && event.Delta.Type == "text_delta" {
			payload, _ := json.Marshal(map[string]string{"content": event.Delta.Text})
			_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("claude: stream scan: %w", err)
	}

	_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	return nil
}

// setHeaders applies the required Anthropic API headers to the request.
func (c *claudeProvider) setHeaders(req *http.Request) {
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", claudeAPIVersion)
	req.Header.Set("content-type", "application/json")
}

// checkStatus maps non-2xx HTTP responses to typed errors.
func (c *claudeProvider) checkStatus(resp *http.Response) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		return ErrRateLimited
	}
	if resp.StatusCode >= 500 {
		return fmt.Errorf("%w: status %d", ErrProviderUnavailable, resp.StatusCode)
	}

	var errResp claudeErrorResponse
	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &errResp); err == nil && errResp.Error.Message != "" {
		return fmt.Errorf("claude: api error %d: %s", resp.StatusCode, errResp.Error.Message)
	}
	return fmt.Errorf("claude: api error %d", resp.StatusCode)
}
