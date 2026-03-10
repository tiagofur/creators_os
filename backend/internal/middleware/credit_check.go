package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// tierLimit maps subscription tier to hourly AI message limit.
var tierLimit = map[string]int{
	"free":       10,
	"pro":        100,
	"enterprise": 500,
}

// CreditCheck enforces per-tier hourly AI message rate limits using a Redis
// sliding-window counter.
//
// Key format: ordo:{env}:credits:{tier}:{user_id}:hour:{hour_epoch}
// On limit breach, responds 429 with X-Credits-Remaining: 0 header.
func CreditCheck(redisClient *redis.Client, env string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := UserClaimsFromContext(r.Context())
			if !ok {
				// No claims → let the auth middleware handle it
				next.ServeHTTP(w, r)
				return
			}

			tier := string(claims.SubscriptionTier)
			limit, exists := tierLimit[tier]
			if !exists {
				limit = tierLimit["free"]
			}

			now := time.Now()
			hourEpoch := now.Truncate(time.Hour).Unix()
			userID := claims.UserID.String()
			key := fmt.Sprintf("ordo:%s:credits:%s:%s:hour:%d", env, tier, userID, hourEpoch)

			ctx := r.Context()
			pipe := redisClient.Pipeline()
			// Remove entries outside the current hour window
			pipe.ZRemRangeByScore(ctx, key, "-inf", strconv.FormatInt(now.Add(-time.Hour).UnixMilli(), 10))
			// Add current request timestamp
			pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixMilli()), Member: now.UnixNano()})
			// Count entries in window
			countCmd := pipe.ZCard(ctx, key)
			// TTL = 2 hours so the key is cleaned up automatically
			pipe.Expire(ctx, key, 2*time.Hour)

			if _, err := pipe.Exec(ctx); err != nil {
				// On Redis failure, allow the request through (fail open)
				next.ServeHTTP(w, r)
				return
			}

			count := countCmd.Val()
			remaining := int64(limit) - count
			if remaining < 0 {
				remaining = 0
			}

			if count > int64(limit) {
				w.Header().Set("X-Credits-Remaining", "0")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"code":"CREDIT_LIMIT","message":"hourly AI message limit reached"}`))
				return
			}

			w.Header().Set("X-Credits-Remaining", strconv.FormatInt(remaining, 10))
			next.ServeHTTP(w, r)
		})
	}
}
