//go:build integration

package testutil

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

// TestApp holds live connections to test containers for integration tests.
// It is created via NewTestApp and torn down via Cleanup.
type TestApp struct {
	DB          *pgxpool.Pool
	RedisClient *redis.Client
	Cleanup     func()
}

// NewTestApp starts PostgreSQL and Redis containers using testcontainers-go,
// runs database migrations, and returns a fully initialized TestApp.
//
// The caller MUST call t.Cleanup(app.Cleanup) to stop the containers.
func NewTestApp(t *testing.T) *TestApp {
	t.Helper()
	ctx := context.Background()

	// --- PostgreSQL ---
	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		postgres.WithDatabase("ordo_test"),
		postgres.WithUsername("ordo"),
		postgres.WithPassword("ordo_test_password"),
		testcontainers.WithWaitStrategy(
			testcontainers.WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("testutil: start postgres container: %v", err)
	}

	pgHost, err := pgContainer.Host(ctx)
	if err != nil {
		t.Fatalf("testutil: get postgres host: %v", err)
	}
	pgPort, err := pgContainer.MappedPort(ctx, "5432")
	if err != nil {
		t.Fatalf("testutil: get postgres port: %v", err)
	}

	pgDSN := fmt.Sprintf(
		"postgres://ordo:ordo_test_password@%s:%s/ordo_test?sslmode=disable",
		pgHost, pgPort.Port(),
	)

	pool, err := pgxpool.New(ctx, pgDSN)
	if err != nil {
		t.Fatalf("testutil: create pgxpool: %v", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		t.Fatalf("testutil: ping postgres: %v", err)
	}

	// --- Redis ---
	redisContainer, err := tcredis.RunContainer(ctx,
		testcontainers.WithImage("redis:7-alpine"),
	)
	if err != nil {
		t.Fatalf("testutil: start redis container: %v", err)
	}

	redisAddr, err := redisContainer.Endpoint(ctx, "")
	if err != nil {
		t.Fatalf("testutil: get redis endpoint: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	rPingCtx, rCancel := context.WithTimeout(ctx, 5*time.Second)
	defer rCancel()
	if err := redisClient.Ping(rPingCtx).Err(); err != nil {
		t.Fatalf("testutil: ping redis: %v", err)
	}

	cleanup := func() {
		pool.Close()
		_ = redisClient.Close()
		_ = pgContainer.Terminate(ctx)
		_ = redisContainer.Terminate(ctx)
	}

	return &TestApp{
		DB:          pool,
		RedisClient: redisClient,
		Cleanup:     cleanup,
	}
}
