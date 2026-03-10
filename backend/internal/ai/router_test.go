package ai

import (
	"context"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockProvider is a test double for AIProvider.
type mockProvider struct {
	name        string
	callCount   int
	returnErr   error
	returnResp  *CompletionResponse
}

func (m *mockProvider) Name() string { return m.name }
func (m *mockProvider) EstimateTokens(content string) int { return len(content) / 4 }
func (m *mockProvider) Complete(_ context.Context, _ CompletionRequest) (*CompletionResponse, error) {
	m.callCount++
	if m.returnErr != nil {
		return nil, m.returnErr
	}
	if m.returnResp != nil {
		return m.returnResp, nil
	}
	return &CompletionResponse{Content: "ok from " + m.name}, nil
}
func (m *mockProvider) Stream(_ context.Context, _ CompletionRequest, w io.Writer) error {
	m.callCount++
	if m.returnErr != nil {
		return m.returnErr
	}
	_, _ = io.WriteString(w, "data: [DONE]\n\n")
	return nil
}

func TestRouter_PrimarySuccess_FallbackNotCalled(t *testing.T) {
	primary := &mockProvider{name: "primary"}
	fallback := &mockProvider{name: "fallback"}
	router := NewRouter(primary, fallback)

	resp, err := router.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	require.NoError(t, err)
	assert.Contains(t, resp.Content, "primary")
	assert.Equal(t, 1, primary.callCount)
	assert.Equal(t, 0, fallback.callCount)
}

func TestRouter_PrimaryRateLimited_FallbackCalled(t *testing.T) {
	primary := &mockProvider{name: "primary", returnErr: ErrRateLimited}
	fallback := &mockProvider{name: "fallback"}
	router := NewRouter(primary, fallback)

	resp, err := router.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	require.NoError(t, err)
	assert.Contains(t, resp.Content, "fallback")
	assert.Equal(t, 1, primary.callCount)
	assert.Equal(t, 1, fallback.callCount)
}

func TestRouter_CircuitBreaker_TripsAfterMaxFailures(t *testing.T) {
	primary := &mockProvider{name: "primary", returnErr: ErrRateLimited}
	fallback := &mockProvider{name: "fallback"}
	router := NewRouter(primary, fallback)
	// Use very short window to keep test fast
	router.failureWindow = 10 * time.Second
	router.maxFailures = 5

	// 5 failures should trip the circuit
	for i := 0; i < 5; i++ {
		_, _ = router.Complete(context.Background(), CompletionRequest{
			Messages: []Message{{Role: "user", Content: "hi"}},
		})
	}

	assert.True(t, router.tripped, "circuit should be tripped after 5 failures")

	// Reset primary to succeed — but should not be called (circuit is tripped)
	primary.returnErr = nil
	primary.callCount = 0
	fallback.callCount = 0

	_, err := router.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	require.NoError(t, err)
	assert.Equal(t, 0, primary.callCount, "primary should be bypassed when circuit is tripped")
	assert.Equal(t, 1, fallback.callCount, "fallback should serve request")
}

func TestRouter_CircuitBreaker_ResetsAfterResetAfter(t *testing.T) {
	primary := &mockProvider{name: "primary", returnErr: ErrRateLimited}
	fallback := &mockProvider{name: "fallback"}
	router := NewRouter(primary, fallback)
	router.maxFailures = 1
	router.failureWindow = 10 * time.Second
	router.resetAfter = 1 * time.Millisecond // trip immediately

	// Trip the circuit
	_, _ = router.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	assert.True(t, router.tripped)

	// Wait for resetAfter to elapse
	time.Sleep(5 * time.Millisecond)

	// Circuit should auto-reset on next call
	primary.returnErr = nil
	primary.callCount = 0
	fallback.callCount = 0

	resp, err := router.Complete(context.Background(), CompletionRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
	})
	require.NoError(t, err)
	assert.Contains(t, resp.Content, "primary")
	assert.Equal(t, 1, primary.callCount, "primary should be called after reset")
}

func TestRouter_Name(t *testing.T) {
	primary := &mockProvider{name: "claude"}
	fallback := &mockProvider{name: "openai"}
	router := NewRouter(primary, fallback)
	assert.Equal(t, "router:claude/openai", router.Name())
}
