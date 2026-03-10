//go:build integration

package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/config"
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

type contentTestEnv struct {
	server *httptest.Server
	pool   *pgxpool.Pool
}

func setupContentTestEnv(t *testing.T) *contentTestEnv {
	t.Helper()
	ctx := context.Background()

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
			"../../db/migrations/000011_create_contents.up.sql",
			"../../db/migrations/000012_create_content_assignments.up.sql",
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

	pgURL, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	pool, err := pgxpool.New(ctx, pgURL)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	redisContainer, err := tcredis.Run(ctx, "redis:7-alpine")
	require.NoError(t, err)
	t.Cleanup(func() { _ = redisContainer.Terminate(ctx) })

	redisURL, err := redisContainer.ConnectionString(ctx)
	require.NoError(t, err)

	opts, err := redis.ParseURL(redisURL)
	require.NoError(t, err)
	redisClient := redis.NewClient(opts)
	t.Cleanup(func() { _ = redisClient.Close() })

	jwtManager := buildEphemeralJWTManager(t)

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: opts.Addr})
	t.Cleanup(func() { _ = asynqClient.Close() })

	userRepo := repository.NewUserRepository(pool)
	sessionRepo := repository.NewSessionRepository(pool)
	wsRepo := repository.NewWorkspaceRepository(pool)
	invRepo := repository.NewInvitationRepository(pool)
	contentRepo := repository.NewContentRepository(pool)

	authSvc := service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, nil, nil)
	wsSvc := service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, nil)
	contentSvc := service.NewContentService(contentRepo, asynqClient, nil)

	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	contentHnd := handler.NewContentHandler(contentSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, contentHnd, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &contentTestEnv{server: ts, pool: pool}
}

func TestContent_CRUD(t *testing.T) {
	env := setupContentTestEnv(t)
	token := registerAndLogin(t, env.server, "content-crud")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Content WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/contents", wsID)

	// Create
	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "My Video"},
		authHeader(token))
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var content map[string]any
	decodeBody(t, resp, &content)
	contentID := content["id"].(string)

	// Get
	resp = doJSON(t, env.server, http.MethodGet, base+"/"+contentID, nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Update
	newTitle := "Updated Video"
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+contentID,
		map[string]*string{"title": &newTitle},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// List
	resp = doJSON(t, env.server, http.MethodGet, base, nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var contents []any
	decodeBody(t, resp, &contents)
	assert.Len(t, contents, 1)

	// Delete
	resp = doJSON(t, env.server, http.MethodDelete, base+"/"+contentID, nil, authHeader(token))
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestContent_KanbanList(t *testing.T) {
	env := setupContentTestEnv(t)
	token := registerAndLogin(t, env.server, "content-kanban")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Kanban WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/contents", wsID)

	// Create a content item
	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Kanban Item"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	// Kanban list
	resp = doJSON(t, env.server, http.MethodGet, base+"?group_by=status", nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var board map[string]any
	decodeBody(t, resp, &board)
	assert.NotNil(t, board["columns"])
}

func TestContent_ValidStatusTransition(t *testing.T) {
	env := setupContentTestEnv(t)
	token := registerAndLogin(t, env.server, "content-transition")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Transition WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/contents", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Transition Content"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var content map[string]any
	decodeBody(t, resp, &content)
	contentID := content["id"].(string)

	// Valid transition: idea -> scripting
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+contentID+"/status",
		map[string]string{"status": "scripting"},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestContent_InvalidStatusTransition(t *testing.T) {
	env := setupContentTestEnv(t)
	token := registerAndLogin(t, env.server, "content-invalid-trans")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Invalid Transition WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/contents", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Invalid Transition Content"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var content map[string]any
	decodeBody(t, resp, &content)
	contentID := content["id"].(string)

	// Invalid transition: idea -> published (skip multiple steps)
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+contentID+"/status",
		map[string]string{"status": "published"},
		authHeader(token))
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestContent_AddRemoveAssignment(t *testing.T) {
	env := setupContentTestEnv(t)
	ownerToken := registerAndLogin(t, env.server, "content-assign-owner")
	assigneeToken := registerAndLogin(t, env.server, "content-assignee")
	assigneeEmail := "content-assignee@workspace-test.example.com"

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Assignment WS"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	// Invite assignee
	invResp := doJSON(t, env.server, http.MethodPost, fmt.Sprintf("/api/v1/workspaces/%s/invitations", wsID),
		map[string]string{"email": assigneeEmail, "role": "editor"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, invResp.StatusCode)
	var inv map[string]any
	decodeBody(t, invResp, &inv)
	invToken := inv["token"].(string)

	acceptResp := doJSON(t, env.server, http.MethodPost, "/api/v1/invitations/"+invToken+"/accept", nil, authHeader(assigneeToken))
	require.Equal(t, http.StatusOK, acceptResp.StatusCode)

	// Get assignee ID
	meResp := doJSON(t, env.server, http.MethodGet, "/api/v1/users/me", nil, authHeader(assigneeToken))
	require.Equal(t, http.StatusOK, meResp.StatusCode)
	var me map[string]any
	decodeBody(t, meResp, &me)
	assigneeID := me["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/contents", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Assignable Content"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var content map[string]any
	decodeBody(t, resp, &content)
	contentID := content["id"].(string)

	// Add assignment
	resp = doJSON(t, env.server, http.MethodPost, base+"/"+contentID+"/assignments",
		map[string]string{"user_id": assigneeID, "role": "editor"},
		authHeader(ownerToken))
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	// Remove assignment
	resp = doJSON(t, env.server, http.MethodDelete, base+"/"+contentID+"/assignments/"+assigneeID, nil, authHeader(ownerToken))
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}
