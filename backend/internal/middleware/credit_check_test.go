package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestRedis returns a Redis client connected to a local Redis instance
// for testing. Tests are skipped if Redis is not available.
func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	client := redis.NewClient(&redis.Options{Addr: "localhost:6379", DB: 15})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	return client
}

func makeClaimsRequest(userID uuid.UUID, tier domain.SubscriptionTier) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/test", nil)
	ctx := WithUserClaims(r.Context(), &domain.UserClaims{
		UserID:           userID,
		Email:            "test@example.com",
		SubscriptionTier: tier,
	})
	return r.WithContext(ctx)
}

func TestCreditCheck_FreeTierLimit(t *testing.T) {
	redisClient := newTestRedis(t)
	defer redisClient.Close()

	userID := uuid.New()
	env := fmt.Sprintf("test-%s", userID.String()[:8])
	defer func() {
		// Cleanup keys
		ctx := context.Background()
		keys, _ := redisClient.Keys(ctx, fmt.Sprintf("ordo:%s:credits:*", env)).Result()
		if len(keys) > 0 {
			redisClient.Del(ctx, keys...)
		}
	}()

	handler := CreditCheck(redisClient, env)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// 10 requests should succeed for free tier
	for i := 0; i < 10; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, makeClaimsRequest(userID, domain.TierFree))
		require.Equal(t, http.StatusOK, rr.Code, "request %d should succeed", i+1)
	}

	// 11th request should be rejected
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, makeClaimsRequest(userID, domain.TierFree))
	assert.Equal(t, http.StatusTooManyRequests, rr.Code, "11th request should be rate limited")
	assert.Equal(t, "0", rr.Header().Get("X-Credits-Remaining"))
}

func TestCreditCheck_ProTierAllows100(t *testing.T) {
	redisClient := newTestRedis(t)
	defer redisClient.Close()

	userID := uuid.New()
	env := fmt.Sprintf("test-%s", userID.String()[:8])
	defer func() {
		ctx := context.Background()
		keys, _ := redisClient.Keys(ctx, fmt.Sprintf("ordo:%s:credits:*", env)).Result()
		if len(keys) > 0 {
			redisClient.Del(ctx, keys...)
		}
	}()

	handler := CreditCheck(redisClient, env)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// 100 requests should pass for pro tier
	for i := 0; i < 100; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, makeClaimsRequest(userID, domain.TierPro))
		require.Equal(t, http.StatusOK, rr.Code, "request %d should succeed", i+1)
	}

	// 101st should be rejected
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, makeClaimsRequest(userID, domain.TierPro))
	assert.Equal(t, http.StatusTooManyRequests, rr.Code, "101st request should be rate limited")
}
