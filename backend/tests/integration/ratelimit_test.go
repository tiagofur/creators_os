//go:build integration

package integration_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRateLimit_AuthEndpoint_GlobalLimit verifies that repeated requests to the
// auth endpoint are rate-limited after the global limit is exceeded.
func TestRateLimit_AuthEndpoint_GlobalLimit(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	env := setupTestEnv(t)

	// The auth route has a limit of 5 req/min in the router.
	// We send 6 requests and expect the 6th to be 429.
	hitLimit := false
	for i := 0; i < 7; i++ {
		resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/login", map[string]string{
			"email":    fmt.Sprintf("ratelimituser%d@example.com", i),
			"password": "wrongpassword",
		}, nil)
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusTooManyRequests {
			hitLimit = true
			// Verify rate limit headers are present.
			assert.NotEmpty(t, resp.Header.Get("Retry-After"), "Retry-After header should be set on 429")
			break
		}
	}
	assert.True(t, hitLimit, "expected to hit rate limit after 5 auth requests per minute")
}

// TestRateLimit_TieredHeaders verifies X-RateLimit headers are set on AI route responses.
func TestRateLimit_TieredHeaders_Present(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	env := setupTestEnv(t)

	// Register and login.
	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "ratelimitheaders@example.com",
		"password":  "password123",
		"full_name": "Rate Limit Headers",
	}, nil)
	require.Equal(t, http.StatusCreated, regResp.StatusCode)
	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(regResp.Body).Decode(&tokens))
	_ = regResp.Body.Close()

	wsResp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces", map[string]string{
		"name": "Rate Limit WS",
	}, map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	require.Equal(t, http.StatusCreated, wsResp.StatusCode)
	var ws map[string]any
	require.NoError(t, json.NewDecoder(wsResp.Body).Decode(&ws))
	_ = wsResp.Body.Close()
	wsID, _ := ws["id"].(string)

	// POST to AI conversations (requires credits; will fail with 402 but headers should be set).
	aiResp := doJSON(t, env.server, http.MethodPost,
		"/api/v1/workspaces/"+wsID+"/ai/conversations", map[string]string{
			"title": "Test",
		}, map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	_ = aiResp.Body.Close()

	// X-RateLimit-Limit should be set by TieredRateLimiter.
	assert.NotEmpty(t, aiResp.Header.Get("X-RateLimit-Limit"),
		"X-RateLimit-Limit should be present on AI routes")
	assert.NotEmpty(t, aiResp.Header.Get("X-RateLimit-Remaining"),
		"X-RateLimit-Remaining should be present on AI routes")
}
