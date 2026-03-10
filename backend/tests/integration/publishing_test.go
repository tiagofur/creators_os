//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/config"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/handler"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/ordo/creators-os/internal/server"
	"github.com/ordo/creators-os/internal/service"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

// publishingTestEnv holds all dependencies for publishing integration tests.
type publishingTestEnv struct {
	server     *httptest.Server
	jwtManager *auth.JWTManager
	pool       *pgxpool.Pool
}

func setupPublishingTestEnv(t *testing.T) *publishingTestEnv {
	t.Helper()
	ctx := context.Background()

	// --- Postgres container with all required migrations ---
	pgContainer, err := tcpostgres.Run(ctx,
		"postgres:16-alpine",
		tcpostgres.WithDatabase("testdb"),
		tcpostgres.WithUsername("test"),
		tcpostgres.WithPassword("test"),
		tcpostgres.WithInitScripts(
			"../../db/migrations/000001_create_extensions.up.sql",
			"../../db/migrations/000002_create_enums.up.sql",
			"../../db/migrations/000003_create_users.up.sql",
			"../../db/migrations/000004_create_user_sessions.up.sql",
			"../../db/migrations/000005_create_workspaces.up.sql",
			"../../db/migrations/000006_create_workspace_members.up.sql",
			"../../db/migrations/000007_create_workspace_invitations.up.sql",
			"../../db/migrations/000021_create_platform_credentials.up.sql",
			"../../db/migrations/000022_create_scheduled_posts.up.sql",
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

	pgURL, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := pgxpool.New(ctx, pgURL)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	// --- Redis container ---
	redisContainer, err := tcredis.Run(ctx, "redis:7-alpine")
	require.NoError(t, err)
	t.Cleanup(func() { _ = redisContainer.Terminate(ctx) })

	redisURL, err := redisContainer.ConnectionString(ctx)
	require.NoError(t, err)

	opts, err := redis.ParseURL(redisURL)
	require.NoError(t, err)
	redisClient := redis.NewClient(opts)
	t.Cleanup(func() { _ = redisClient.Close() })

	// --- JWT ---
	jwtManager := buildEphemeralJWTManager(t)

	// --- Asynq client ---
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: opts.Addr})
	t.Cleanup(func() { _ = asynqClient.Close() })

	// --- Repositories ---
	userRepo := repository.NewUserRepository(pool)
	sessionRepo := repository.NewSessionRepository(pool)
	wsRepo := repository.NewWorkspaceRepository(pool)
	invRepo := repository.NewInvitationRepository(pool)
	publishingRepo := repository.NewPublishingRepository(pool)

	// --- Services ---
	authSvc := service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, nil, nil)
	wsSvc := service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, nil)

	// AES key padded to 32 bytes for AES-256
	aesKey := make([]byte, 32)
	copy(aesKey, []byte("test-encryption-key"))
	publishingSvc := service.NewPublishingService(publishingRepo, aesKey, nil)

	// --- Handlers ---
	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")
	publishingHnd := handler.NewPublishingHandler(publishingSvc)

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, nil, nil, nil, nil, nil,
		publishingHnd, nil, nil, nil, nil, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &publishingTestEnv{server: ts, jwtManager: jwtManager, pool: pool}
}

// registerAndGetToken registers a new user and returns their access token and user ID.
func registerUserForPublishing(t *testing.T, ts *httptest.Server, email string) (accessToken string, userID string) {
	t.Helper()
	resp := doJSONPublishing(t, ts, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": email, "password": "pass1234", "full_name": "Test User",
	}, nil)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&tokens))
	resp.Body.Close()
	return tokens.AccessToken, ""
}

// createWorkspaceForPublishing creates a workspace and returns its ID.
func createWorkspaceForPublishing(t *testing.T, ts *httptest.Server, token string) string {
	t.Helper()
	resp := doJSONPublishing(t, ts, http.MethodPost, "/api/v1/workspaces", map[string]string{
		"name": "Test Workspace",
	}, map[string]string{"Authorization": "Bearer " + token})
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&ws))
	resp.Body.Close()
	id, _ := ws["id"].(string)
	require.NotEmpty(t, id)
	return id
}

func doJSONPublishing(t *testing.T, ts *httptest.Server, method, path string, body any, headers map[string]string) *http.Response {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		require.NoError(t, json.NewEncoder(&buf).Encode(body))
	}
	req, err := http.NewRequest(method, ts.URL+path, &buf)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

// TestStoreCredential_201 verifies that storing a platform credential returns 201.
func TestStoreCredential_201(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupPublishingTestEnv(t)

	token, _ := registerUserForPublishing(t, env.server, "cred-test@example.com")
	wsID := createWorkspaceForPublishing(t, env.server, token)

	resp := doJSONPublishing(t, env.server, http.MethodPost,
		fmt.Sprintf("/api/v1/workspaces/%s/publishing/credentials", wsID),
		map[string]any{
			"platform":     "youtube",
			"access_token": "ya29.test-token",
		},
		map[string]string{"Authorization": "Bearer " + token},
	)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	resp.Body.Close()
}

// TestListCredentials_200 verifies that listing platform credentials returns 200.
func TestListCredentials_200(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupPublishingTestEnv(t)

	token, _ := registerUserForPublishing(t, env.server, "cred-list@example.com")
	wsID := createWorkspaceForPublishing(t, env.server, token)

	// Store a credential first
	storeResp := doJSONPublishing(t, env.server, http.MethodPost,
		fmt.Sprintf("/api/v1/workspaces/%s/publishing/credentials", wsID),
		map[string]any{
			"platform":     "youtube",
			"access_token": "ya29.list-test-token",
		},
		map[string]string{"Authorization": "Bearer " + token},
	)
	storeResp.Body.Close()

	// List credentials
	resp := doJSONPublishing(t, env.server, http.MethodGet,
		fmt.Sprintf("/api/v1/workspaces/%s/publishing/credentials", wsID),
		nil,
		map[string]string{"Authorization": "Bearer " + token},
	)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var creds []map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&creds))
	resp.Body.Close()
	assert.GreaterOrEqual(t, len(creds), 1)
}

// TestSchedulePost_ValidFutureDate_201 verifies that scheduling a post for a future date returns 201.
func TestSchedulePost_ValidFutureDate_201(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupPublishingTestEnv(t)

	token, _ := registerUserForPublishing(t, env.server, "schedule-future@example.com")
	wsID := createWorkspaceForPublishing(t, env.server, token)

	futureTime := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)
	resp := doJSONPublishing(t, env.server, http.MethodPost,
		fmt.Sprintf("/api/v1/workspaces/%s/publishing/schedule", wsID),
		map[string]any{
			"content_id":   "00000000-0000-0000-0000-000000000001",
			"platform":     "youtube",
			"scheduled_at": futureTime,
			"title":        "Test Post",
		},
		map[string]string{"Authorization": "Bearer " + token},
	)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	resp.Body.Close()
}

// TestSchedulePost_PastDate_400 verifies that scheduling a post for a past date returns 400.
func TestSchedulePost_PastDate_400(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupPublishingTestEnv(t)

	token, _ := registerUserForPublishing(t, env.server, "schedule-past@example.com")
	wsID := createWorkspaceForPublishing(t, env.server, token)

	pastTime := time.Now().Add(-24 * time.Hour).UTC().Format(time.RFC3339)
	resp := doJSONPublishing(t, env.server, http.MethodPost,
		fmt.Sprintf("/api/v1/workspaces/%s/publishing/schedule", wsID),
		map[string]any{
			"content_id":   "00000000-0000-0000-0000-000000000001",
			"platform":     "youtube",
			"scheduled_at": pastTime,
			"title":        "Past Post",
		},
		map[string]string{"Authorization": "Bearer " + token},
	)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	resp.Body.Close()
}

// TestGetCalendar_DateRange_200 verifies that the calendar endpoint returns 200 with a date range.
func TestGetCalendar_DateRange_200(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupPublishingTestEnv(t)

	token, _ := registerUserForPublishing(t, env.server, "calendar@example.com")
	wsID := createWorkspaceForPublishing(t, env.server, token)

	from := time.Now().UTC().Format(time.RFC3339)
	to := time.Now().Add(7 * 24 * time.Hour).UTC().Format(time.RFC3339)
	path := fmt.Sprintf("/api/v1/workspaces/%s/publishing/calendar?from=%s&to=%s", wsID, from, to)

	resp := doJSONPublishing(t, env.server, http.MethodGet, path, nil,
		map[string]string{"Authorization": "Bearer " + token},
	)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	resp.Body.Close()
}
