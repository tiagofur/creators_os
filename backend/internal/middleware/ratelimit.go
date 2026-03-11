package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/redis/go-redis/v9"
)

// TierLimits defines rate limits per subscription tier for a given endpoint group.
// Units: requests per hour.
type TierLimits struct {
	Free       int
	Pro        int
	Enterprise int
}

// DefaultTierLimits maps endpoint group names to per-tier hourly limits.
var DefaultTierLimits = map[string]TierLimits{
	"ai_messages":    {Free: 10, Pro: 100, Enterprise: 500},
	"content_writes": {Free: 30, Pro: 200, Enterprise: 1000},
	"file_uploads":   {Free: 10, Pro: 50, Enterprise: 500},
	"analytics_sync": {Free: 1, Pro: 10, Enterprise: 100},
}

// TieredRateLimiter returns a middleware that enforces per-tier sliding-window
// rate limits backed by Redis.
//
// Algorithm:
//  1. Reads subscription_tier from JWT claims in context (set by Authenticate middleware).
//  2. Selects the limit for this endpoint group from limits.
//  3. Applies a 1-hour sliding window using a Redis sorted set.
//  4. Key: ordo:{env}:ratelimit:{tier}:{user_id}:{endpoint_group}:{hour_epoch}
//  5. On limit breach returns 429 with Retry-After, X-RateLimit-Limit,
//     X-RateLimit-Remaining headers.
func TieredRateLimiter(redisClient *redis.Client, env, endpointGroup string, limits TierLimits) func(http.Handler) http.Handler {
	window := time.Hour

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := UserClaimsFromContext(r.Context())
			if !ok {
				// No claims → fall through (auth middleware should have rejected already)
				next.ServeHTTP(w, r)
				return
			}

			limit := tieredLimit(claims.SubscriptionTier, limits)

			now := time.Now()
			hourEpoch := now.Truncate(window).Unix()
			key := fmt.Sprintf("ordo:%s:ratelimit:%s:%s:%s:%d",
				env,
				string(claims.SubscriptionTier),
				claims.UserID.String(),
				endpointGroup,
				hourEpoch,
			)

			ctx := r.Context()
			count, err := slidingWindowCount(ctx, redisClient, key, now, window)
			if err != nil {
				// Redis error → allow through
				next.ServeHTTP(w, r)
				return
			}

			remaining := limit - int(count)
			if remaining < 0 {
				remaining = 0
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

			if count > int64(limit) {
				retryAfter := int(window.Seconds())
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"code":"RATE_LIMIT","message":"rate limit exceeded for your subscription tier"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// tieredLimit returns the appropriate request limit for the given subscription tier.
func tieredLimit(tier domain.SubscriptionTier, limits TierLimits) int {
	switch tier {
	case domain.TierEnterprise:
		return limits.Enterprise
	case domain.TierPro:
		return limits.Pro
	default:
		return limits.Free
	}
}

// slidingWindowCount performs a Redis pipeline to:
//  1. Remove entries older than the window.
//  2. Add the current request.
//  3. Count entries in the window.
//  4. Set TTL on the key.
//
// Returns the count after adding the current request.
func slidingWindowCount(ctx context.Context, client *redis.Client, key string, now time.Time, window time.Duration) (int64, error) {
	pipe := client.Pipeline()
	pipe.ZRemRangeByScore(ctx, key, "-inf", strconv.FormatInt(now.Add(-window).UnixMilli(), 10))
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixMilli()), Member: now.UnixNano()})
	countCmd := pipe.ZCard(ctx, key)
	pipe.Expire(ctx, key, window*2)

	if _, err := pipe.Exec(ctx); err != nil {
		return 0, err
	}
	return countCmd.Val(), nil
}

// RateLimiter returns a sliding-window rate-limiting middleware backed by Redis.
//
// Key format: ordo:{env}:ratelimit:{ip}:{path_prefix}:{window_minute}
// On limit breach responds 429 with Retry-After header.
func RateLimiter(redisClient *redis.Client, env string, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
				ip = strings.SplitN(fwd, ",", 2)[0]
			}
			ip = strings.TrimSpace(ip)
			// Strip port so that all connections from the same host share one bucket.
			if host, _, err := net.SplitHostPort(ip); err == nil {
				ip = host
			}

			// Use the first two path segments as the key prefix to group related routes
			pathPrefix := pathKey(r.URL.Path)

			now := time.Now()
			windowMinute := now.Truncate(window).Unix()
			key := fmt.Sprintf("ordo:%s:ratelimit:%s:%s:%d", env, ip, pathPrefix, windowMinute)

			ctx := r.Context()
			pipe := redisClient.Pipeline()
			// Remove entries older than the window
			pipe.ZRemRangeByScore(ctx, key, "-inf", strconv.FormatInt(now.Add(-window).UnixMilli(), 10))
			// Add current request
			pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixMilli()), Member: now.UnixNano()})
			// Count entries in the window
			countCmd := pipe.ZCard(ctx, key)
			// Set TTL so the key expires automatically
			pipe.Expire(ctx, key, window*2)

			if _, err := pipe.Exec(ctx); err != nil {
				// On Redis error, allow the request through
				next.ServeHTTP(w, r)
				return
			}

			count := countCmd.Val()
			if count > int64(limit) {
				retryAfter := int(window.Seconds())
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"code":"RATE_LIMIT","message":"too many requests"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// pathKey returns the first two non-empty path segments joined by "_".
// e.g. /api/v1/auth/login → "api_v1"
func pathKey(path string) string {
	parts := strings.SplitN(strings.TrimPrefix(path, "/"), "/", 4)
	if len(parts) >= 2 {
		return parts[0] + "_" + parts[1]
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return "root"
}
