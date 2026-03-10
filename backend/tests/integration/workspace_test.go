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

// workspaceTestEnv holds all dependencies for workspace integration tests.
type workspaceTestEnv struct {
	server *httptest.Server
	pool   *pgxpool.Pool
}

func setupWorkspaceTestEnv(t *testing.T) *workspaceTestEnv {
	t.Helper()
	ctx := context.Background()

	// --- Postgres container ---
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

	// --- Asynq client (pointing at test redis) ---
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: opts.Addr})
	t.Cleanup(func() { _ = asynqClient.Close() })

	// --- Repositories ---
	userRepo := repository.NewUserRepository(pool)
	sessionRepo := repository.NewSessionRepository(pool)
	wsRepo := repository.NewWorkspaceRepository(pool)
	invRepo := repository.NewInvitationRepository(pool)

	// --- Services ---
	authSvc := service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, nil, nil)
	wsSvc := service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, nil)

	// --- Handlers ---
	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &workspaceTestEnv{server: ts, pool: pool}
}

// registerAndLogin is a helper that registers a new unique user and returns an access token.
func registerAndLogin(t *testing.T, ts *httptest.Server, emailPrefix string) string {
	t.Helper()
	email := fmt.Sprintf("%s@workspace-test.example.com", emailPrefix)
	resp := doJSON(t, ts, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": email, "password": "pass1234", "full_name": emailPrefix,
	}, nil)
	require.Equal(t, http.StatusCreated, resp.StatusCode, "registration should succeed")
	var tokens domain.AuthTokens
	decodeBody(t, resp, &tokens)
	require.NotEmpty(t, tokens.AccessToken)
	return tokens.AccessToken
}

func authHeader(token string) map[string]string {
	return map[string]string{"Authorization": "Bearer " + token}
}

// ---- Workspace Tests ----

func TestWorkspace_Create_201(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	token := registerAndLogin(t, env.server, "ws-creator")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "My Workspace", "description": "A test workspace"},
		authHeader(token))

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var ws map[string]any
	decodeBody(t, resp, &ws)
	assert.NotEmpty(t, ws["id"])
	assert.Equal(t, "My Workspace", ws["name"])
}

func TestWorkspace_FreeTierLimit_402(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	token := registerAndLogin(t, env.server, "ws-limit")

	// Create first workspace (should succeed)
	resp1 := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "First Workspace"},
		authHeader(token))
	assert.Equal(t, http.StatusCreated, resp1.StatusCode)
	resp1.Body.Close()

	// Create second workspace (should fail — free tier limit is 1)
	resp2 := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Second Workspace"},
		authHeader(token))
	assert.Equal(t, http.StatusPaymentRequired, resp2.StatusCode)

	var errResp map[string]any
	decodeBody(t, resp2, &errResp)
	assert.Equal(t, "WORKSPACE_LIMIT_REACHED", errResp["code"])
}

func TestWorkspace_Get_200(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	token := registerAndLogin(t, env.server, "ws-getter")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Get Test Workspace"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Get workspace
	resp2 := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID, nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp2.StatusCode)
	var ws map[string]any
	decodeBody(t, resp2, &ws)
	assert.Equal(t, wsID, ws["id"])
}

func TestWorkspace_Update_200(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	token := registerAndLogin(t, env.server, "ws-updater")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Original Name"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Update workspace
	newName := "Updated Name"
	resp2 := doJSON(t, env.server, http.MethodPut, "/api/v1/workspaces/"+wsID,
		map[string]*string{"name": &newName},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp2.StatusCode)
	var updated map[string]any
	decodeBody(t, resp2, &updated)
	assert.Equal(t, "Updated Name", updated["name"])
}

func TestWorkspace_Delete_NonOwner_403(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	ownerToken := registerAndLogin(t, env.server, "ws-del-owner")
	memberToken := registerAndLogin(t, env.server, "ws-del-member")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Delete Test Workspace"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Non-member tries to delete — should get 403 (not a member)
	resp2 := doJSON(t, env.server, http.MethodDelete, "/api/v1/workspaces/"+wsID, nil, authHeader(memberToken))
	assert.Equal(t, http.StatusForbidden, resp2.StatusCode)
	resp2.Body.Close()
}

func TestWorkspace_ListMembers_200(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	token := registerAndLogin(t, env.server, "ws-members")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Members Test Workspace"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// List members
	resp2 := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID+"/members", nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp2.StatusCode)
	var members []any
	decodeBody(t, resp2, &members)
	// Owner should be the only member
	assert.Len(t, members, 1)
}

func TestWorkspace_RemoveOwner_400(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	ownerToken := registerAndLogin(t, env.server, "ws-rm-owner")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Remove Owner Test"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Get owner's user ID from members list
	membersResp := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID+"/members", nil, authHeader(ownerToken))
	require.Equal(t, http.StatusOK, membersResp.StatusCode)
	var members []map[string]any
	decodeBody(t, membersResp, &members)
	require.Len(t, members, 1)
	ownerUserID := members[0]["user_id"].(string)

	// Try to remove owner — should fail with 400
	resp2 := doJSON(t, env.server, http.MethodDelete, "/api/v1/workspaces/"+wsID+"/members/"+ownerUserID, nil, authHeader(ownerToken))
	assert.Equal(t, http.StatusBadRequest, resp2.StatusCode)
	resp2.Body.Close()
}

func TestWorkspace_InviteAndAccept_200(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	ownerToken := registerAndLogin(t, env.server, "ws-invite-owner")
	inviteeToken := registerAndLogin(t, env.server, "ws-invitee")
	inviteeEmail := "ws-invitee@workspace-test.example.com"

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Invite Test Workspace"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Invite member
	resp2 := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces/"+wsID+"/invitations",
		map[string]string{"email": inviteeEmail, "role": "editor"},
		authHeader(ownerToken))
	assert.Equal(t, http.StatusCreated, resp2.StatusCode)
	var inv map[string]any
	decodeBody(t, resp2, &inv)
	require.NotEmpty(t, inv["token"])
	token := inv["token"].(string)

	// Accept invitation
	resp3 := doJSON(t, env.server, http.MethodPost, "/api/v1/invitations/"+token+"/accept", nil, authHeader(inviteeToken))
	assert.Equal(t, http.StatusOK, resp3.StatusCode)
	resp3.Body.Close()

	// Verify invitee is now a member
	membersResp := doJSON(t, env.server, http.MethodGet, "/api/v1/workspaces/"+wsID+"/members", nil, authHeader(ownerToken))
	require.Equal(t, http.StatusOK, membersResp.StatusCode)
	var members []map[string]any
	decodeBody(t, membersResp, &members)
	assert.Len(t, members, 2)
}

func TestWorkspace_FreeTierMemberLimit_402(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	ownerToken := registerAndLogin(t, env.server, "ws-ml-owner")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Member Limit Workspace"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Invite 2 members to reach the free tier limit of 3 total
	// (owner is already 1 member, so 2 more invitations = 3 total)
	for i := 0; i < 2; i++ {
		inviteeEmail := fmt.Sprintf("ws-ml-invitee-%d@workspace-test.example.com", i)
		resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces/"+wsID+"/invitations",
			map[string]string{"email": inviteeEmail, "role": "viewer"},
			authHeader(ownerToken))
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		resp.Body.Close()
	}

	// 4th member invitation should be rejected (free tier limit = 3)
	resp4 := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces/"+wsID+"/invitations",
		map[string]string{"email": "ws-ml-invitee-4@workspace-test.example.com", "role": "viewer"},
		authHeader(ownerToken))
	assert.Equal(t, http.StatusPaymentRequired, resp4.StatusCode)
	var errResp map[string]any
	decodeBody(t, resp4, &errResp)
	assert.Equal(t, "MEMBER_LIMIT_REACHED", errResp["code"])
}

func TestWorkspace_RBAC_ViewerBlockedFromAdmin_403(t *testing.T) {
	env := setupWorkspaceTestEnv(t)
	ownerToken := registerAndLogin(t, env.server, "ws-rbac-owner")
	viewerToken := registerAndLogin(t, env.server, "ws-rbac-viewer")
	viewerEmail := "ws-rbac-viewer@workspace-test.example.com"

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "RBAC Test Workspace"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created map[string]any
	decodeBody(t, resp, &created)
	wsID := created["id"].(string)

	// Invite viewer
	invResp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces/"+wsID+"/invitations",
		map[string]string{"email": viewerEmail, "role": "viewer"},
		authHeader(ownerToken))
	require.Equal(t, http.StatusCreated, invResp.StatusCode)
	var inv map[string]any
	decodeBody(t, invResp, &inv)
	invToken := inv["token"].(string)

	// Accept invitation
	acceptResp := doJSON(t, env.server, http.MethodPost, "/api/v1/invitations/"+invToken+"/accept", nil, authHeader(viewerToken))
	require.Equal(t, http.StatusOK, acceptResp.StatusCode)
	acceptResp.Body.Close()

	// Viewer tries to invite another member (admin-only route) — should get 403
	resp2 := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces/"+wsID+"/invitations",
		map[string]string{"email": "another@example.com", "role": "viewer"},
		authHeader(viewerToken))
	assert.Equal(t, http.StatusForbidden, resp2.StatusCode)
	resp2.Body.Close()

	// Viewer tries to update workspace (admin-only route) — should get 403
	newName := "Updated by Viewer"
	resp3 := doJSON(t, env.server, http.MethodPut, "/api/v1/workspaces/"+wsID,
		map[string]*string{"name": &newName},
		authHeader(viewerToken))
	assert.Equal(t, http.StatusForbidden, resp3.StatusCode)
	resp3.Body.Close()
}
