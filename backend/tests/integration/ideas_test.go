//go:build integration

package integration_test

import (
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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type ideasTestEnv struct {
	server *httptest.Server
	pool   *pgxpool.Pool
}

func setupIdeasTestEnv(t *testing.T) *ideasTestEnv {
	t.Helper()

	pool, redisClient, _ := startContainers(t)

	jwtManager := buildEphemeralJWTManager(t)

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: redisClient.Options().Addr})
	t.Cleanup(func() { _ = asynqClient.Close() })

	userRepo := repository.NewUserRepository(pool)
	sessionRepo := repository.NewSessionRepository(pool)
	wsRepo := repository.NewWorkspaceRepository(pool)
	invRepo := repository.NewInvitationRepository(pool)
	ideaRepo := repository.NewIdeaRepository(pool)
	contentRepo := repository.NewContentRepository(pool)

	authSvc := service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, nil, nil)
	wsSvc := service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, nil)
	ideaSvc := service.NewIdeaService(ideaRepo, contentRepo, asynqClient, nil)
	contentSvc := service.NewContentService(contentRepo, asynqClient, nil)

	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	ideaHnd := handler.NewIdeaHandler(ideaSvc)
	contentHnd := handler.NewContentHandler(contentSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		ideaHnd, contentHnd, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &ideasTestEnv{server: ts, pool: pool}
}

func TestIdeas_CreateAndList(t *testing.T) {
	env := setupIdeasTestEnv(t)

	token := registerAndLogin(t, env.server, "idea-creator")

	// Create workspace
	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Ideas Workspace"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/ideas", wsID)

	// Create idea
	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "My First Idea"},
		authHeader(token))
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var idea map[string]any
	decodeBody(t, resp, &idea)
	ideaID := idea["id"].(string)
	assert.NotEmpty(t, ideaID)

	// List ideas
	resp = doJSON(t, env.server, http.MethodGet, base, nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var ideas []any
	decodeBody(t, resp, &ideas)
	assert.Len(t, ideas, 1)
}

func TestIdeas_UpdateAndDelete(t *testing.T) {
	env := setupIdeasTestEnv(t)
	token := registerAndLogin(t, env.server, "idea-updater")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Ideas WS 2"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/ideas", wsID)

	// Create
	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Original Title"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var idea map[string]any
	decodeBody(t, resp, &idea)
	ideaID := idea["id"].(string)

	// Update
	newTitle := "Updated Title"
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+ideaID,
		map[string]*string{"title": &newTitle},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Delete
	resp = doJSON(t, env.server, http.MethodDelete, base+"/"+ideaID, nil, authHeader(token))
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestIdeas_RequestValidation(t *testing.T) {
	env := setupIdeasTestEnv(t)
	token := registerAndLogin(t, env.server, "idea-validator")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Validate WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/ideas", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Validate This"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var idea map[string]any
	decodeBody(t, resp, &idea)
	ideaID := idea["id"].(string)

	// Request validation — returns 202
	resp = doJSON(t, env.server, http.MethodPost, base+"/"+ideaID+"/validate", nil, authHeader(token))
	assert.Equal(t, http.StatusAccepted, resp.StatusCode)
}

func TestIdeas_SetTags(t *testing.T) {
	env := setupIdeasTestEnv(t)
	token := registerAndLogin(t, env.server, "idea-tagger")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Tags WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/ideas", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Tagged Idea"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var idea map[string]any
	decodeBody(t, resp, &idea)
	ideaID := idea["id"].(string)

	// Set tags
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+ideaID+"/tags",
		map[string][]string{"tags": {"comedy", "tech"}},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var tagged map[string]any
	decodeBody(t, resp, &tagged)
	assert.NotNil(t, tagged["tags"])
}

func TestIdeas_Promote(t *testing.T) {
	env := setupIdeasTestEnv(t)
	token := registerAndLogin(t, env.server, "idea-promoter")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Promote WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/ideas", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Promotable Idea"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var idea map[string]any
	decodeBody(t, resp, &idea)
	ideaID := idea["id"].(string)

	// Promote — returns 201 with content record
	resp = doJSON(t, env.server, http.MethodPost, base+"/"+ideaID+"/promote", nil, authHeader(token))
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var content map[string]any
	decodeBody(t, resp, &content)
	assert.NotEmpty(t, content["id"])
	assert.Equal(t, "Promotable Idea", content["title"])
}
