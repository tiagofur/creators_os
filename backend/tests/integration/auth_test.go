//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"testing"

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

// testEnv holds all dependencies for integration tests.
type testEnv struct {
	server     *httptest.Server
	jwtManager *auth.JWTManager
}

func buildEphemeralJWTManager(t *testing.T) *auth.JWTManager {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	privDER, err := x509.MarshalPKCS8PrivateKey(priv)
	require.NoError(t, err)
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privDER})

	pubDER, err := x509.MarshalPKIXPublicKey(&priv.PublicKey)
	require.NoError(t, err)
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	mgr, err := auth.NewJWTManager(privPEM, pubPEM)
	require.NoError(t, err)
	return mgr
}

func setupTestEnv(t *testing.T) *testEnv {
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

	return &testEnv{server: ts, jwtManager: jwtManager}
}

// ---- Helpers ----

func doJSON(t *testing.T, ts *httptest.Server, method, path string, body any, headers map[string]string) *http.Response {
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

func decodeBody(t *testing.T, resp *http.Response, v any) {
	t.Helper()
	defer resp.Body.Close()
	require.NoError(t, json.NewDecoder(resp.Body).Decode(v))
}

// ---- Tests ----

func TestRegister_201(t *testing.T) {
	env := setupTestEnv(t)

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "alice@example.com", "password": "pass1234", "full_name": "Alice",
	}, nil)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var tokens domain.AuthTokens
	decodeBody(t, resp, &tokens)
	assert.NotEmpty(t, tokens.AccessToken)
	assert.NotEmpty(t, tokens.RefreshToken)
}

func TestRegister_DuplicateEmail_409(t *testing.T) {
	env := setupTestEnv(t)

	body := map[string]string{"email": "dup@example.com", "password": "pass1234", "full_name": "Dup"}
	r1 := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", body, nil)
	r1.Body.Close()

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", body, nil)
	assert.Equal(t, http.StatusConflict, resp.StatusCode)
	resp.Body.Close()
}

func TestLogin_200(t *testing.T) {
	env := setupTestEnv(t)

	r := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "bob@example.com", "password": "pass1234", "full_name": "Bob",
	}, nil)
	r.Body.Close()

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email": "bob@example.com", "password": "pass1234",
	}, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var tokens domain.AuthTokens
	decodeBody(t, resp, &tokens)
	assert.NotEmpty(t, tokens.AccessToken)
}

func TestLogin_WrongPassword_401(t *testing.T) {
	env := setupTestEnv(t)

	r := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "carol@example.com", "password": "rightpass", "full_name": "Carol",
	}, nil)
	r.Body.Close()

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email": "carol@example.com", "password": "wrongpass",
	}, nil)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	resp.Body.Close()
}

func TestRefresh_200(t *testing.T) {
	env := setupTestEnv(t)

	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "dave@example.com", "password": "pass1234", "full_name": "Dave",
	}, nil)
	var tokens domain.AuthTokens
	decodeBody(t, regResp, &tokens)

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": tokens.RefreshToken,
	}, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var newTokens domain.AuthTokens
	decodeBody(t, resp, &newTokens)
	assert.NotEmpty(t, newTokens.AccessToken)
}

func TestRefresh_Replay_401(t *testing.T) {
	env := setupTestEnv(t)

	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "eve@example.com", "password": "pass1234", "full_name": "Eve",
	}, nil)
	var tokens domain.AuthTokens
	decodeBody(t, regResp, &tokens)

	// First use — succeeds
	r1 := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": tokens.RefreshToken,
	}, nil)
	r1.Body.Close()

	// Replay — same token, now revoked
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": tokens.RefreshToken,
	}, nil)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	resp.Body.Close()
}

func TestLogout_204(t *testing.T) {
	env := setupTestEnv(t)

	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "frank@example.com", "password": "pass1234", "full_name": "Frank",
	}, nil)
	var tokens domain.AuthTokens
	decodeBody(t, regResp, &tokens)

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/logout", map[string]string{
		"refresh_token": tokens.RefreshToken,
	}, nil)
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	resp.Body.Close()
}

func TestLogoutAll_RevokesAll(t *testing.T) {
	env := setupTestEnv(t)

	regResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": "grace@example.com", "password": "pass1234", "full_name": "Grace",
	}, nil)
	var tokens1 domain.AuthTokens
	decodeBody(t, regResp, &tokens1)

	loginResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/login", map[string]string{
		"email": "grace@example.com", "password": "pass1234",
	}, nil)
	var tokens2 domain.AuthTokens
	decodeBody(t, loginResp, &tokens2)

	// logout-all using access token
	logoutResp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/logout-all", nil, map[string]string{
		"Authorization": "Bearer " + tokens1.AccessToken,
	})
	assert.Equal(t, http.StatusNoContent, logoutResp.StatusCode)
	logoutResp.Body.Close()

	// Both refresh tokens should now be revoked
	r1 := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": tokens1.RefreshToken,
	}, nil)
	assert.Equal(t, http.StatusUnauthorized, r1.StatusCode)
	r1.Body.Close()

	r2 := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/refresh", map[string]string{
		"refresh_token": tokens2.RefreshToken,
	}, nil)
	assert.Equal(t, http.StatusUnauthorized, r2.StatusCode)
	r2.Body.Close()
}

func TestForgotPassword_Always200(t *testing.T) {
	env := setupTestEnv(t)

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/forgot-password", map[string]string{
		"email": "nobody@example.com",
	}, nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	resp.Body.Close()
}

func TestRateLimit_429(t *testing.T) {
	env := setupTestEnv(t)

	var lastStatus int
	for i := 0; i < 10; i++ {
		resp := doJSON(t, env.server, http.MethodPost, "/api/v1/auth/login", map[string]string{
			"email": "noone@example.com", "password": "wrongpass",
		}, nil)
		lastStatus = resp.StatusCode
		resp.Body.Close()
		if lastStatus == http.StatusTooManyRequests {
			break
		}
	}
	assert.Equal(t, http.StatusTooManyRequests, lastStatus)
}
