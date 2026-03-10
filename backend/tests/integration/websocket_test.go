//go:build integration

package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/config"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/handler"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/ordo/creators-os/internal/server"
	"github.com/ordo/creators-os/internal/service"
	appws "github.com/ordo/creators-os/internal/ws"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

// wsTestEnv holds all dependencies for WebSocket integration tests.
type wsTestEnv struct {
	server     *httptest.Server
	jwtManager *auth.JWTManager
	pool       *pgxpool.Pool
	hub        *appws.Hub
}

func setupWSTestEnv(t *testing.T) *wsTestEnv {
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

	// --- Asynq client ---
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

	// --- WebSocket Hub ---
	hub := appws.NewHub()
	go hub.Run()

	// --- Handlers ---
	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")
	wsHandlerHTTP := handler.NewWSHandler(hub, jwtManager)

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, nil, nil, nil, nil, nil,
		nil, nil, nil, nil, nil, wsHandlerHTTP, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &wsTestEnv{server: ts, jwtManager: jwtManager, pool: pool, hub: hub}
}

// mintTokenForWS generates a JWT access token for a given user ID.
func mintTokenForWS(t *testing.T, jwtManager *auth.JWTManager, userID uuid.UUID) string {
	t.Helper()
	token, err := jwtManager.GenerateAccessToken(userID, "user@example.com", domain.TierFree)
	require.NoError(t, err)
	return token
}

// wsURL converts an httptest server URL to a WebSocket URL.
func wsURL(ts *httptest.Server, path string) string {
	return "ws" + ts.URL[len("http"):] + path
}

// TestWebSocket_ValidJWT_101Upgrade verifies that a WebSocket connection with a
// valid JWT token is upgraded to 101 Switching Protocols.
func TestWebSocket_ValidJWT_101Upgrade(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupWSTestEnv(t)

	userID := uuid.New()
	token := mintTokenForWS(t, env.jwtManager, userID)
	wsID := uuid.New()

	url := fmt.Sprintf("%s?token=%s&workspace_id=%s",
		wsURL(env.server, "/api/v1/ws"), token, wsID.String())

	conn, resp, err := websocket.DefaultDialer.Dial(url, nil)
	require.NoError(t, err, "WebSocket dial with valid JWT should succeed")
	defer conn.Close()

	assert.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)
}

// TestWebSocket_InvalidJWT_401 verifies that a WebSocket connection with an
// invalid token receives a 401 HTTP response (before upgrade).
func TestWebSocket_InvalidJWT_401(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupWSTestEnv(t)

	url := fmt.Sprintf("%s?token=invalid.jwt.token",
		wsURL(env.server, "/api/v1/ws"))

	_, resp, err := websocket.DefaultDialer.Dial(url, nil)
	// Dial returns an error because the server returns a non-101 response
	assert.Error(t, err)
	if resp != nil {
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	}
}

// TestWebSocket_BroadcastReachesClientsInSameWorkspace verifies that a broadcast
// event sent to a workspace ID is received by all clients connected to that workspace.
func TestWebSocket_BroadcastReachesClientsInSameWorkspace(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupWSTestEnv(t)

	workspaceID := uuid.New()
	userID1 := uuid.New()
	userID2 := uuid.New()

	token1 := mintTokenForWS(t, env.jwtManager, userID1)
	token2 := mintTokenForWS(t, env.jwtManager, userID2)

	dial := func(token string) *websocket.Conn {
		url := fmt.Sprintf("%s?token=%s&workspace_id=%s",
			wsURL(env.server, "/api/v1/ws"), token, workspaceID.String())
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		require.NoError(t, err)
		return conn
	}

	conn1 := dial(token1)
	defer conn1.Close()
	conn2 := dial(token2)
	defer conn2.Close()

	// Allow time for both clients to register with the hub
	time.Sleep(50 * time.Millisecond)

	// Broadcast an event to the workspace
	event := appws.Event{
		Event: "test.broadcast",
		Payload: map[string]any{
			"message": "hello workspace",
		},
	}
	env.hub.Broadcast(workspaceID, event)

	// Both clients in the same workspace should receive the message
	for i, conn := range []*websocket.Conn{conn1, conn2} {
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, msg, err := conn.ReadMessage()
		assert.NoError(t, err, "client %d should receive broadcast", i+1)
		assert.Contains(t, string(msg), "hello workspace")
	}
}

// TestWebSocket_ClientInDifferentWorkspaceDoesNotReceiveBroadcast verifies that
// a broadcast to workspace A does not reach a client connected to workspace B.
func TestWebSocket_ClientInDifferentWorkspaceDoesNotReceiveBroadcast(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupWSTestEnv(t)

	workspaceA := uuid.New()
	workspaceB := uuid.New()
	userA := uuid.New()
	userB := uuid.New()

	tokenA := mintTokenForWS(t, env.jwtManager, userA)
	tokenB := mintTokenForWS(t, env.jwtManager, userB)

	dialToWorkspace := func(token string, wsID uuid.UUID) *websocket.Conn {
		url := fmt.Sprintf("%s?token=%s&workspace_id=%s",
			wsURL(env.server, "/api/v1/ws"), token, wsID.String())
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		require.NoError(t, err)
		return conn
	}

	connA := dialToWorkspace(tokenA, workspaceA)
	defer connA.Close()
	connB := dialToWorkspace(tokenB, workspaceB)
	defer connB.Close()

	// Allow time for both clients to register
	time.Sleep(50 * time.Millisecond)

	// Broadcast only to workspace A
	event := appws.Event{
		Event: "test.workspace_a_only",
		Payload: map[string]any{
			"message": "workspace A secret",
		},
	}
	env.hub.Broadcast(workspaceA, event)

	// Client A should receive it
	connA.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msgA, err := connA.ReadMessage()
	assert.NoError(t, err, "client in workspace A should receive broadcast")
	assert.Contains(t, string(msgA), "workspace A secret")

	// Client B should NOT receive it — read should timeout
	connB.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
	_, _, errB := connB.ReadMessage()
	assert.Error(t, errB, "client in workspace B should NOT receive workspace A broadcast")
}
