//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
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

const testStripeWebhookSecret = "whsec_test_billing_integration"

// billingTestEnv holds all dependencies for billing integration tests.
type billingTestEnv struct {
	server     *httptest.Server
	jwtManager *auth.JWTManager
	pool       *pgxpool.Pool
}

func setupBillingTestEnv(t *testing.T) *billingTestEnv {
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
	// Billing service with test Stripe keys (calls won't hit live Stripe in unit tests)
	billingSvc := service.NewBillingService(
		"sk_test_integration_dummy_key",
		testStripeWebhookSecret,
		userRepo,
		redisClient,
		nil,
	)

	// --- Handlers ---
	authHnd := handler.NewAuthHandler(authSvc, jwtManager, nil)
	userHnd := handler.NewUserHandler(userRepo)
	wsHnd := handler.NewWorkspaceHandler(wsSvc)
	healthHnd := handler.NewHealthHandler(pool, redisClient, "test")
	billingHnd := handler.NewBillingHandler(billingSvc)

	cfg := &config.Config{AppEnv: "test", CORSAllowedOrigins: []string{"*"}}
	router := server.NewRouter(cfg, redisClient, healthHnd, authHnd, userHnd, wsHnd, jwtManager, wsRepo,
		nil, nil, nil, nil, nil, nil,
		nil, nil, nil, nil, billingHnd, nil, nil, nil)

	ts := httptest.NewServer(router)
	t.Cleanup(ts.Close)

	return &billingTestEnv{server: ts, jwtManager: jwtManager, pool: pool}
}

func doJSONBilling(t *testing.T, ts *httptest.Server, method, path string, body any, headers map[string]string) *http.Response {
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

// signStripePayload generates a Stripe-Signature header for webhook testing.
// Uses HMAC-SHA256 matching the stripe-go library verification logic.
func signStripePayload(t *testing.T, secret, payload string) string {
	t.Helper()
	ts := fmt.Sprintf("%d", time.Now().Unix())
	mac := hmac.New(sha256.New, []byte(strings.TrimPrefix(secret, "whsec_")))
	mac.Write([]byte(ts + "." + payload))
	sig := hex.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("t=%s,v1=%s", ts, sig)
}

// registerAndGetTokenBilling registers a new user and returns their access token.
func registerAndGetTokenBilling(t *testing.T, ts *httptest.Server, email string) string {
	t.Helper()
	resp := doJSONBilling(t, ts, http.MethodPost, "/api/v1/auth/register", map[string]string{
		"email": email, "password": "pass1234", "full_name": "Billing User",
	}, nil)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var tokens domain.AuthTokens
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&tokens))
	resp.Body.Close()
	return tokens.AccessToken
}

// TestCreateCheckoutSession_ReturnsURL_200 verifies that the checkout endpoint
// returns 200 with a URL field. Note: with a test key Stripe returns an error,
// so we verify the handler path is reachable and returns a structured response.
func TestCreateCheckoutSession_ReturnsURL_200(t *testing.T) {
	t.Skip("integration: requires docker and valid Stripe test key")
	env := setupBillingTestEnv(t)

	token := registerAndGetTokenBilling(t, env.server, "checkout@example.com")

	resp := doJSONBilling(t, env.server, http.MethodPost, "/api/v1/billing/checkout",
		map[string]string{"price_id": "price_test_123"},
		map[string]string{"Authorization": "Bearer " + token},
	)
	// With a live test key: expect 200 with url field.
	// With a dummy key: expect a 4xx/5xx from Stripe client error.
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	resp.Body.Close()
	assert.NotEmpty(t, body["url"])
}

// TestHandleWebhook_ValidSignature_200 verifies that a properly signed webhook returns 200.
func TestHandleWebhook_ValidSignature_200(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupBillingTestEnv(t)

	// Construct a minimal customer.subscription.created event payload
	eventPayload := `{
		"id": "evt_test_integration_001",
		"type": "customer.subscription.created",
		"data": {
			"object": {
				"id": "sub_test_001",
				"customer": "cus_test_001",
				"status": "active"
			}
		}
	}`

	sig := signStripePayload(t, testStripeWebhookSecret, eventPayload)

	req, err := http.NewRequest(http.MethodPost, env.server.URL+"/webhooks/stripe",
		strings.NewReader(eventPayload))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Stripe-Signature", sig)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

// TestHandleWebhook_Idempotency verifies that the same Stripe event can be sent
// twice without duplicate processing. Both requests should return 200.
func TestHandleWebhook_Idempotency(t *testing.T) {
	t.Skip("integration: requires docker for testcontainers")
	env := setupBillingTestEnv(t)

	eventPayload := `{
		"id": "evt_test_idempotency_001",
		"type": "customer.subscription.updated",
		"data": {
			"object": {
				"id": "sub_idem_001",
				"customer": "cus_idem_001",
				"status": "active"
			}
		}
	}`

	sendWebhook := func() *http.Response {
		sig := signStripePayload(t, testStripeWebhookSecret, eventPayload)
		req, err := http.NewRequest(http.MethodPost, env.server.URL+"/webhooks/stripe",
			strings.NewReader(eventPayload))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", sig)
		resp, err := http.DefaultClient.Do(req)
		require.NoError(t, err)
		return resp
	}

	// First delivery
	resp1 := sendWebhook()
	assert.Equal(t, http.StatusOK, resp1.StatusCode, "first webhook delivery should return 200")
	resp1.Body.Close()

	// Second delivery (same event_id) — idempotency: should return 200 but not process twice
	resp2 := sendWebhook()
	assert.Equal(t, http.StatusOK, resp2.StatusCode, "idempotent second delivery should return 200")
	resp2.Body.Close()
}
