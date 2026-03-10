//go:build integration

package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/config"
	"github.com/ordo/creators-os/internal/handler"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/ordo/creators-os/internal/server"
	"github.com/ordo/creators-os/internal/service"
	"github.com/ordo/creators-os/internal/storage"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

// mockStorageClient is a test double for the StorageClient.
type mockStorageClient struct {
	existingKeys map[string]bool
}

func (m *mockStorageClient) PresignPutURL(_ context.Context, key string, _ time.Duration) (string, error) {
	return fmt.Sprintf("https://mock-storage.example.com/%s?presigned=put", key), nil
}

func (m *mockStorageClient) PresignGetURL(_ context.Context, key string, _ time.Duration) (string, error) {
	return fmt.Sprintf("https://mock-storage.example.com/%s?presigned=get", key), nil
}

func (m *mockStorageClient) HeadObject(_ context.Context, key string) (*storage.ObjectInfo, error) {
	if m.existingKeys[key] {
		return &storage.ObjectInfo{Key: key, Size: 1024, ContentType: "video/mp4"}, nil
	}
	return nil, fmt.Errorf("object not found: %s", key)
}

type uploadTestEnv struct {
	server        *httptest.Server
	pool          *pgxpool.Pool
	storageClient *mockStorageClient
}

func setupUploadTestEnv(t *testing.T) *uploadTestEnv {
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

	authSvc := service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, nil, nil)
	wsSvc := service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, nil)

	mockStorage := &mockStorageClient{existingKeys: map[string]bool{}}

	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	uploadHnd := handler.NewUploadHandler(mockStorage)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, nil, nil, uploadHnd, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &uploadTestEnv{server: ts, pool: pool, storageClient: mockStorage}
}

func TestUpload_Presign(t *testing.T) {
	env := setupUploadTestEnv(t)
	token := registerAndLogin(t, env.server, "upload-presign")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/uploads/presign",
		map[string]string{
			"content_type":   "video/mp4",
			"file_extension": "mp4",
			"workspace_id":   "00000000-0000-0000-0000-000000000001",
		},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var result map[string]any
	decodeBody(t, resp, &result)
	assert.NotEmpty(t, result["upload_url"])
	assert.NotEmpty(t, result["object_key"])
	assert.NotEmpty(t, result["expires_at"])
}

func TestUpload_Presign_InvalidContentType(t *testing.T) {
	env := setupUploadTestEnv(t)
	token := registerAndLogin(t, env.server, "upload-invalid-type")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/uploads/presign",
		map[string]string{
			"content_type":   "application/exe",
			"file_extension": "exe",
			"workspace_id":   "00000000-0000-0000-0000-000000000001",
		},
		authHeader(token))
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestUpload_Confirm_ObjectNotFound(t *testing.T) {
	env := setupUploadTestEnv(t)
	token := registerAndLogin(t, env.server, "upload-confirm")

	// Confirm with a key that doesn't exist in mock storage
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/uploads/confirm",
		map[string]string{"object_key": "workspace-1/video/nonexistent.mp4"},
		authHeader(token))
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestUpload_Confirm_Success(t *testing.T) {
	env := setupUploadTestEnv(t)
	token := registerAndLogin(t, env.server, "upload-confirm-ok")

	// Pre-populate mock storage
	objectKey := "test-ws/video/test-file.mp4"
	env.storageClient.existingKeys[objectKey] = true

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/uploads/confirm",
		map[string]string{"object_key": objectKey},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}
