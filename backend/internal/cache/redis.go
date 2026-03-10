package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// NewClient creates and returns a configured *redis.Client connected to the
// Redis server specified by redisURL (format: redis://:password@host:6379/0).
//
// Client settings:
//   - PoolSize:     10
//   - MinIdleConns: 2
//   - MaxRetries:   3
//   - DialTimeout:  5 seconds
//
// Key namespace convention: ordo:{env}:{module}:{key}
// Example: ordo:prod:ratelimit:user_123:auth:2026031012
//
// Performs a startup ping with a 5-second timeout and panics on failure.
func NewClient(ctx context.Context, redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("cache: parse redis URL: %w", err)
	}

	// Override with our preferred settings
	opts.PoolSize = 10
	opts.MinIdleConns = 2
	opts.MaxIdleConns = 5
	opts.MaxRetries = 3
	opts.MinRetryBackoff = 8 * time.Millisecond
	opts.MaxRetryBackoff = 512 * time.Millisecond
	opts.DialTimeout = 5 * time.Second
	opts.ReadTimeout = 3 * time.Second
	opts.WriteTimeout = 3 * time.Second
	opts.ConnMaxIdleTime = 5 * time.Minute
	opts.ConnMaxLifetime = 30 * time.Minute

	client := redis.NewClient(opts)

	// Startup health check — fail fast if Redis is unreachable
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("cache: startup ping failed: %w", err)
	}

	return client, nil
}
