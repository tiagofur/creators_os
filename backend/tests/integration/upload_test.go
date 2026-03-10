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
	"github.com/stretchr/testify/assert"
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

	pool, redisClient, _ := startContainers(t)

	jwtManager := buildEphemeralJWTManager(t)

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: redisClient.Options().Addr})
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
