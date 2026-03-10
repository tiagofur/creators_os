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

func TestOpenAIComplete_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/chat/completions", r.URL.Path)
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer ")

		resp := openAIResponse{
			ID:    "chatcmpl_test",
			Model: openAIDefaultModel,
			Choices: []openAIChoice{
				{Message: openAIMessage{Role: "assistant", Content: "Hello from OpenAI!"}},
			},
			Usage: openAIUsage{PromptTokens: 8, CompletionTokens: 4},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	p := &openAIProvider{
		apiKey: "test-key",
		model:  openAIDefaultModel,
		httpClient: &http.Client{
			Transport: &redirectTransport{base: srv.URL},
		},
	}

	resp, err := p.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	require.NoError(t, err)
	assert.Equal(t, "Hello from OpenAI!", resp.Content)
	assert.Equal(t, 8, resp.InputTokens)
	assert.Equal(t, 4, resp.OutputTokens)
}

func TestOpenAIComplete_RateLimited(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	p := &openAIProvider{
		apiKey: "test-key",
		model:  openAIDefaultModel,
		httpClient: &http.Client{
			Transport: &redirectTransport{base: srv.URL},
		},
	}

	_, err := p.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	assert.ErrorIs(t, err, ErrRateLimited)
}

func TestOpenAIStream_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		events := []string{
			`{"choices":[{"delta":{"content":"Hello"}}]}`,
			`{"choices":[{"delta":{"content":" OpenAI"}}]}`,
		}
		for _, e := range events {
			_, _ = io.WriteString(w, "data: "+e+"\n\n")
		}
		_, _ = io.WriteString(w, "data: [DONE]\n\n")
	}))
	defer srv.Close()

	p := &openAIProvider{
		apiKey: "test-key",
		model:  openAIDefaultModel,
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
	assert.Contains(t, buf.String(), "OpenAI")
	assert.Contains(t, buf.String(), "[DONE]")
}

func TestOpenAIName(t *testing.T) {
	p := &openAIProvider{}
	assert.Equal(t, "openai", p.Name())
}
