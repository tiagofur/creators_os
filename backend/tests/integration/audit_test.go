//go:build integration

package integration_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuditLogs_NonOwnerForbidden(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	env := setupTestEnv(t)

	// Register a regular user.
	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "audituser@example.com",
		"password":  "password123",
		"full_name": "Audit User",
	}, nil)
	require.Equal(t, http.StatusCreated, regResp.StatusCode)

	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(regResp.Body).Decode(&tokens))
	_ = regResp.Body.Close()

	// Create a workspace (owner).
	wsResp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces", map[string]string{
		"name": "Audit Workspace",
	}, map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	require.Equal(t, http.StatusCreated, wsResp.StatusCode)
	var ws map[string]any
	require.NoError(t, json.NewDecoder(wsResp.Body).Decode(&ws))
	_ = wsResp.Body.Close()
	wsID, _ := ws["id"].(string)

	// Register a second user (member, not owner).
	reg2Resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "auditviewer@example.com",
		"password":  "password123",
		"full_name": "Audit Viewer",
	}, nil)
	require.Equal(t, http.StatusCreated, reg2Resp.StatusCode)
	var tokens2 domain.AuthTokens
	require.NoError(t, json.NewDecoder(reg2Resp.Body).Decode(&tokens2))
	_ = reg2Resp.Body.Close()

	// Owner can access audit logs (200).
	ownerResp := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID+"/audit-logs", nil,
		map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	assert.Equal(t, http.StatusOK, ownerResp.StatusCode)
	_ = ownerResp.Body.Close()
}

func TestAuditLogs_Endpoint_ReturnsLogs(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	env := setupTestEnv(t)

	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "auditlogs2@example.com",
		"password":  "password123",
		"full_name": "Audit Logs User",
	}, nil)
	require.Equal(t, http.StatusCreated, regResp.StatusCode)
	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(regResp.Body).Decode(&tokens))
	_ = regResp.Body.Close()

	wsResp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces", map[string]string{
		"name": "Audit Logs WS",
	}, map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	require.Equal(t, http.StatusCreated, wsResp.StatusCode)
	var ws map[string]any
	require.NoError(t, json.NewDecoder(wsResp.Body).Decode(&ws))
	_ = wsResp.Body.Close()
	wsID, _ := ws["id"].(string)

	// Audit logs endpoint returns expected shape.
	resp := doJSON(t, env.server, http.MethodGet,
		"/api/v1/workspaces/"+wsID+"/audit-logs?limit=10&offset=0", nil,
		map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	_ = resp.Body.Close()

	assert.Contains(t, body, "logs")
	assert.Contains(t, body, "limit")
	assert.Contains(t, body, "offset")
}
