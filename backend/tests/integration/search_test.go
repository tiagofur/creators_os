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


func TestSearch_ReturnsRankedResults(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	// This test verifies the search endpoint responds correctly.
	// Full seed + FTS requires the FTS migration (000030) applied.
	// Here we test the endpoint contract: valid token, q param required.

	env := setupTestEnv(t)

	// Register and login to get token.
	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "searchtest@example.com",
		"password":  "password123",
		"full_name": "Search Tester",
	}, nil)
	require.Equal(t, http.StatusCreated, regResp.StatusCode)

	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(regResp.Body).Decode(&tokens))
	_ = regResp.Body.Close()

	// Create a workspace.
	wsResp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces", map[string]string{
		"name": "Search Workspace",
	}, map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	require.Equal(t, http.StatusCreated, wsResp.StatusCode)

	var ws map[string]any
	require.NoError(t, json.NewDecoder(wsResp.Body).Decode(&ws))
	_ = wsResp.Body.Close()
	wsID, _ := ws["id"].(string)

	// Missing q param returns 400.
	resp := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID+"/search", nil,
		map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	_ = resp.Body.Close()

	// Valid q param returns 200 with SearchResponse shape.
	resp2 := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID+"/search?q=test", nil,
		map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	assert.Equal(t, http.StatusOK, resp2.StatusCode)

	var searchResp domain.SearchResponse
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&searchResp))
	_ = resp2.Body.Close()

	assert.Equal(t, "test", searchResp.Query)
	assert.NotNil(t, searchResp.Results)
}

func TestSearch_TypesFilter(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	env := setupTestEnv(t)

	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email":     "searchtypes@example.com",
		"password":  "password123",
		"full_name": "Search Types Tester",
	}, nil)
	require.Equal(t, http.StatusCreated, regResp.StatusCode)

	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(regResp.Body).Decode(&tokens))
	_ = regResp.Body.Close()

	wsResp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces", map[string]string{
		"name": "Type Filter Workspace",
	}, map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	require.Equal(t, http.StatusCreated, wsResp.StatusCode)
	var ws map[string]any
	require.NoError(t, json.NewDecoder(wsResp.Body).Decode(&ws))
	_ = wsResp.Body.Close()
	wsID, _ := ws["id"].(string)

	// types filter param accepted without error.
	resp := doJSON(t, env.server, http.MethodGet,
		"/api/v1/workspaces/"+wsID+"/search?q=tech&types=ideas,contents", nil,
		map[string]string{"Authorization": "Bearer " + tokens.AccessToken})
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var searchResp domain.SearchResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&searchResp))
	_ = resp.Body.Close()

	// All returned results must be of requested types.
	for _, r := range searchResp.Results {
		assert.True(t, r.Type == domain.SearchResultIdea || r.Type == domain.SearchResultContent,
			"unexpected result type: %s", r.Type)
	}
}

