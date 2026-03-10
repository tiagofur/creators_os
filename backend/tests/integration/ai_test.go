//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAIConversationCRUD tests the full conversation lifecycle.
// Requires a running database and Redis (set DATABASE_URL and REDIS_URL env vars).
func TestAIConversationCRUD(t *testing.T) {
	t.Skip("integration: requires running infrastructure (set -tags integration to enable)")

	ctx := context.Background()
	_ = ctx

	// TODO: bootstrap test server, create workspace + user
	// POST /api/v1/workspaces/{id}/ai/conversations → 201
	// GET  /api/v1/workspaces/{id}/ai/conversations → 200 with 1 item
	// GET  /api/v1/workspaces/{id}/ai/conversations/{convId} → 200
	// DELETE /api/v1/workspaces/{id}/ai/conversations/{convId} → 204
}

// TestAISendMessage_SSEStream tests that the send message endpoint returns SSE.
func TestAISendMessage_SSEStream(t *testing.T) {
	t.Skip("integration: requires running infrastructure")

	// TODO: create conversation, POST message, verify SSE stream with data: chunks
	// Verify conversation now has 2 messages (user + assistant)
}

// TestGetCreditBalance_200 tests that the credit balance endpoint returns 200
// with a non-negative balance field.
func TestGetCreditBalance_200(t *testing.T) {
	t.Skip("integration: requires running infrastructure")

	// GET /api/v1/users/me/ai/credits with a valid JWT
	// Expect 200 with {"balance": N} where N >= 0
}

// TestAICreditDeduction tests that credits are deducted on AI calls.
func TestAICreditDeduction(t *testing.T) {
	t.Skip("integration: requires running infrastructure")

	// TODO: get initial balance, make AI call, verify balance decreased
}

// TestAICreditDeduction_ConcurrentRace verifies atomic credit deduction.
// Two goroutines concurrently try to spend 8 credits from a balance of 10.
// Exactly one should succeed.
func TestAICreditDeduction_ConcurrentRace(t *testing.T) {
	t.Skip("integration: requires running infrastructure")

	var (
		successCount int64
		wg           sync.WaitGroup
	)

	// Simulate two concurrent requests
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// TODO: POST to brainstorm endpoint, check response code
			// 200 → increment successCount
			// 402 → insufficient credits (expected for second request)
			atomic.AddInt64(&successCount, 1)
		}()
	}
	wg.Wait()

	assert.Equal(t, int64(1), successCount, "exactly one concurrent request should succeed")
}

// stubSSEHandler returns a handler that writes a minimal SSE response.
func stubSSEHandler(t *testing.T) http.Handler {
	t.Helper()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = w.Write([]byte("data: {\"content\":\"hello\"}\n\ndata: [DONE]\n\n"))
	})
}

// TestSSEResponseParsing validates SSE client-side parsing logic.
func TestSSEResponseParsing(t *testing.T) {
	srv := httptest.NewServer(stubSSEHandler(t))
	defer srv.Close()

	resp, err := http.Get(srv.URL)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, "text/event-stream", resp.Header.Get("Content-Type"))

	buf := new(bytes.Buffer)
	_, _ = buf.ReadFrom(resp.Body)
	body := buf.String()

	assert.Contains(t, body, "data:")
	assert.Contains(t, body, "[DONE]")

	// Parse the data chunk
	lines := splitSSELines(body)
	var found bool
	for _, line := range lines {
		if len(line) > 6 && line[:5] == "data:" {
			payload := line[5:]
			var msg map[string]string
			if err := json.Unmarshal([]byte(payload), &msg); err == nil {
				if msg["content"] == "hello" {
					found = true
				}
			}
		}
	}
	assert.True(t, found, "should find content chunk in SSE stream")
}

func splitSSELines(body string) []string {
	var lines []string
	for _, line := range bytes.Split([]byte(body), []byte("\n")) {
		trimmed := string(bytes.TrimSpace(line))
		if trimmed != "" {
			lines = append(lines, trimmed)
		}
	}
	return lines
}
