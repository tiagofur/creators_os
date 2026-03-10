//go:build integration

package integration_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	migratepostgres "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

// runMigrations runs all migrations in ../../db/migrations against the given Postgres URL.
func runMigrations(t *testing.T, pgURL string) {
	t.Helper()
	ctx := context.Background()

	sqlDB, err := sql.Open("postgres", pgURL)
	require.NoError(t, err)

	// Wait for Postgres to be ready.
	pingCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	for {
		if pingErr := sqlDB.PingContext(pingCtx); pingErr == nil {
			break
		} else if pingCtx.Err() != nil {
			require.NoError(t, pingErr, "postgres not ready for migrations")
		}
		time.Sleep(200 * time.Millisecond)
	}

	migrateDriver, err := migratepostgres.WithInstance(sqlDB, &migratepostgres.Config{})
	require.NoError(t, err)
	m, err := migrate.NewWithDatabaseInstance("file://../../db/migrations", "postgres", migrateDriver)
	require.NoError(t, err)
	migrateErr := m.Up()
	require.True(t, migrateErr == nil || errors.Is(migrateErr, migrate.ErrNoChange), "migrations failed: %v", migrateErr)
	sqlDB.Close()
}

// startContainers starts postgres:16-alpine and redis:7-alpine test containers,
// runs all 30 migrations, and returns the pool, redisClient, and pgURL.
// All resources are registered for cleanup via t.Cleanup.
func startContainers(t *testing.T) (*pgxpool.Pool, *redis.Client, string) {
	t.Helper()
	ctx := context.Background()

	// --- Postgres container ---
	pgContainer, err := tcpostgres.Run(ctx,
		"postgres:16-alpine",
		tcpostgres.WithDatabase("testdb"),
		tcpostgres.WithUsername("test"),
		tcpostgres.WithPassword("test"),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

	pgURL, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	// Run all migrations.
	runMigrations(t, pgURL)

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

	return pool, redisClient, pgURL
}
