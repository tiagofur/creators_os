package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClaudeComplete_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/messages", r.URL.Path)
		assert.Equal(t, "test-key", r.Header.Get("x-api-key"))

		resp := claudeResponse{
			ID:    "msg_test",
			Model: claudeDefaultModel,
			Content: []claudeContentBlock{
				{Type: "text", Text: "Hello, world!"},
			},
			Usage: claudeUsage{InputTokens: 10, OutputTokens: 5},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	p := &claudeProvider{
		apiKey:     "test-key",
		model:      claudeDefaultModel,
		httpClient: srv.Client(),
		logger:     nil,
	}
	// Override base URL by monkey-patching is not ideal; use custom transport instead.
	// For this test we use a custom httpClient that redirects all requests to the test server.
	p.httpClient = &http.Client{
		Transport: &redirectTransport{base: srv.URL},
	}

	resp, err := p.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	require.NoError(t, err)
	assert.Equal(t, "Hello, world!", resp.Content)
	assert.Equal(t, 10, resp.InputTokens)
	assert.Equal(t, 5, resp.OutputTokens)
}

func TestClaudeComplete_RateLimited(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	p := &claudeProvider{
		apiKey: "test-key",
		model:  claudeDefaultModel,
		httpClient: &http.Client{
			Transport: &redirectTransport{base: srv.URL},
		},
	}

	_, err := p.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	assert.ErrorIs(t, err, ErrRateLimited)
}

func TestClaudeStream_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		events := []string{
			`{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}`,
			`{"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}`,
			`{"type":"message_stop"}`,
		}
		for _, e := range events {
			_, _ = io.WriteString(w, "data: "+e+"\n\n")
		}
	}))
	defer srv.Close()

	p := &claudeProvider{
		apiKey: "test-key",
		model:  claudeDefaultModel,
		httpClient: &http.Client{
			Transport: &redirectTransport{base: srv.URL},
		},
	}

	var buf strings.Builder
	err := p.Stream(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	}, &buf)
	require.NoError(t, err)
	assert.Contains(t, buf.String(), "Hello")
	assert.Contains(t, buf.String(), "world")
	assert.Contains(t, buf.String(), "[DONE]")
}

func TestClaudeEstimateTokens(t *testing.T) {
	p := &claudeProvider{}
	// "1234567890123456" = 16 chars → 16/4 = 4
	assert.Equal(t, 4, p.EstimateTokens("1234567890123456"))
}

// redirectTransport rewrites all requests to the given base URL (for httptest.Server).
type redirectTransport struct {
	base string
}

func (rt *redirectTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req2 := req.Clone(req.Context())
	req2.URL.Scheme = "http"
	req2.URL.Host = strings.TrimPrefix(rt.base, "http://")
	return http.DefaultTransport.RoundTrip(req2)
}
