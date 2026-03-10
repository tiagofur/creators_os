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

type seriesTestEnv struct {
	server *httptest.Server
	pool   *pgxpool.Pool
}

func setupSeriesTestEnv(t *testing.T) *seriesTestEnv {
	t.Helper()

	pool, redisClient, _ := startContainers(t)

	jwtManager := buildEphemeralJWTManager(t)

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: redisClient.Options().Addr})
	t.Cleanup(func() { _ = asynqClient.Close() })

	userRepo := repository.NewUserRepository(pool)
	sessionRepo := repository.NewSessionRepository(pool)
	wsRepo := repository.NewWorkspaceRepository(pool)
	invRepo := repository.NewInvitationRepository(pool)
	seriesRepo := repository.NewSeriesRepository(pool)

	authSvc := service.NewAuthService(userRepo, sessionRepo, jwtManager, asynqClient, nil, nil)
	wsSvc := service.NewWorkspaceService(wsRepo, invRepo, userRepo, asynqClient, nil)
	seriesSvc := service.NewSeriesService(seriesRepo, nil)

	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	seriesHnd := handler.NewSeriesHandler(seriesSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, nil, seriesHnd, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &seriesTestEnv{server: ts, pool: pool}
}

func TestSeries_CRUD(t *testing.T) {
	env := setupSeriesTestEnv(t)
	token := registerAndLogin(t, env.server, "series-creator")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Series WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/series", wsID)

	// Create
	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "My Series"},
		authHeader(token))
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var series map[string]any
	decodeBody(t, resp, &series)
	seriesID := series["id"].(string)

	// Get
	resp = doJSON(t, env.server, http.MethodGet, base+"/"+seriesID, nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// List
	resp = doJSON(t, env.server, http.MethodGet, base, nil, authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var seriesList []any
	decodeBody(t, resp, &seriesList)
	assert.Len(t, seriesList, 1)

	// Update
	newTitle := "Updated Series"
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+seriesID,
		map[string]*string{"title": &newTitle},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Delete
	resp = doJSON(t, env.server, http.MethodDelete, base+"/"+seriesID, nil, authHeader(token))
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestSeries_Episodes(t *testing.T) {
	env := setupSeriesTestEnv(t)
	token := registerAndLogin(t, env.server, "series-episodes")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Episodes WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/series", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Episode Series"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var series map[string]any
	decodeBody(t, resp, &series)
	seriesID := series["id"].(string)

	// Add episode
	resp = doJSON(t, env.server, http.MethodPost, base+"/"+seriesID+"/episodes",
		map[string]any{"title": "Episode 1", "episode_number": 1},
		authHeader(token))
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	var ep map[string]any
	decodeBody(t, resp, &ep)
	epID := ep["id"].(string)

	// Update episode
	newEpTitle := "Episode 1 - Updated"
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+seriesID+"/episodes/"+epID,
		map[string]*string{"title": &newEpTitle},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Delete episode
	resp = doJSON(t, env.server, http.MethodDelete, base+"/"+seriesID+"/episodes/"+epID, nil, authHeader(token))
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestSeries_UpsertSchedule(t *testing.T) {
	env := setupSeriesTestEnv(t)
	token := registerAndLogin(t, env.server, "series-schedule")

	resp := doJSON(t, env.server, http.MethodPost, "/api/v1/workspaces",
		map[string]string{"name": "Schedule WS"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var ws map[string]any
	decodeBody(t, resp, &ws)
	wsID := ws["id"].(string)

	base := fmt.Sprintf("/api/v1/workspaces/%s/series", wsID)

	resp = doJSON(t, env.server, http.MethodPost, base,
		map[string]string{"title": "Scheduled Series"},
		authHeader(token))
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var series map[string]any
	decodeBody(t, resp, &series)
	seriesID := series["id"].(string)

	// Upsert schedule
	resp = doJSON(t, env.server, http.MethodPut, base+"/"+seriesID+"/schedule",
		map[string]any{
			"frequency":   "weekly",
			"day_of_week": 1,
			"time_of_day": "10:00",
			"timezone":    "America/New_York",
			"is_active":   true,
		},
		authHeader(token))
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	var schedule map[string]any
	decodeBody(t, resp, &schedule)
	assert.Equal(t, "weekly", schedule["frequency"])
}
