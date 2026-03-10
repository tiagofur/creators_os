package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates and returns a configured *pgxpool.Pool connected to the
// PostgreSQL database specified by databaseURL.
//
// Pool settings:
//   - MinConns: 2
//   - MaxConns: 20
//   - MaxConnLifetime: 30 minutes
//   - MaxConnIdleTime: 5 minutes
//   - HealthCheckPeriod: 1 minute
//
// Performs a startup ping with a 10-second timeout and panics on failure to
// provide fast feedback when the database is unreachable at boot time.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("database: parse config: %w", err)
	}

	cfg.MinConns = 2
	cfg.MaxConns = 20
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("database: create pool: %w", err)
	}

	// Startup health check — fail fast if DB is unreachable
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("database: startup ping failed: %w", err)
	}

	return pool, nil
}
