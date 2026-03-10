package ai

import (
	"context"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"
)

// Router wraps a primary and fallback AIProvider with a circuit breaker.
// When the primary fails too many times within the failure window, the circuit
// trips and all requests are routed directly to the fallback until resetAfter
// has elapsed.
type Router struct {
	primary  AIProvider
	fallback AIProvider

	// circuit breaker state
	mu          sync.Mutex
	failures    int
	lastFail    time.Time
	tripped     bool
	maxFailures   int
	failureWindow time.Duration
	resetAfter    time.Duration
}

// NewRouter creates a Router with the given primary and fallback providers.
// Default thresholds: 5 failures within 60s trips the breaker; resets after 120s.
func NewRouter(primary, fallback AIProvider) *Router {
	return &Router{
		primary:       primary,
		fallback:      fallback,
		maxFailures:   5,
		failureWindow: 60 * time.Second,
		resetAfter:    120 * time.Second,
	}
}

// Name returns a composite identifier for the router.
func (r *Router) Name() string {
	primaryName := "nil"
	fallbackName := "nil"
	if r.primary != nil {
		primaryName = r.primary.Name()
	}
	if r.fallback != nil {
		fallbackName = r.fallback.Name()
	}
	return fmt.Sprintf("router:%s/%s", primaryName, fallbackName)
}

// EstimateTokens delegates to the primary provider, or fallback if primary is nil.
func (r *Router) EstimateTokens(content string) int {
	if r.primary != nil {
		return r.primary.EstimateTokens(content)
	}
	if r.fallback != nil {
		return r.fallback.EstimateTokens(content)
	}
	return len(content) / 4
}

// Complete attempts the primary provider; falls back on ErrRateLimited, 5xx
// (ErrProviderUnavailable), or when the circuit breaker is tripped.
func (r *Router) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	if r.shouldUseFallback() {
		return r.completeFallback(ctx, req)
	}

	resp, err := r.primary.Complete(ctx, req)
	if err != nil {
		if r.isFallbackTrigger(err) {
			r.recordFailure()
			return r.completeFallback(ctx, req)
		}
		return nil, err
	}
	r.recordSuccess()
	return resp, nil
}

// Stream attempts the primary provider for streaming; falls back when needed.
func (r *Router) Stream(ctx context.Context, req CompletionRequest, w io.Writer) error {
	if r.shouldUseFallback() {
		return r.streamFallback(ctx, req, w)
	}

	err := r.primary.Stream(ctx, req, w)
	if err != nil {
		if r.isFallbackTrigger(err) {
			r.recordFailure()
			return r.streamFallback(ctx, req, w)
		}
		return err
	}
	r.recordSuccess()
	return nil
}

// shouldUseFallback returns true when the circuit breaker is tripped (or should reset).
func (r *Router) shouldUseFallback() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if !r.tripped {
		return false
	}
	// Auto-reset after resetAfter has elapsed since the last failure
	if time.Since(r.lastFail) >= r.resetAfter {
		r.tripped = false
		r.failures = 0
		return false
	}
	return true
}

// recordFailure increments the failure counter and trips the breaker if the
// threshold is reached within the failure window.
func (r *Router) recordFailure() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	// Reset counter if outside the failure window
	if now.Sub(r.lastFail) > r.failureWindow {
		r.failures = 0
	}
	r.failures++
	r.lastFail = now
	if r.failures >= r.maxFailures {
		r.tripped = true
	}
}

// recordSuccess resets the failure counter when the primary succeeds.
func (r *Router) recordSuccess() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.failures = 0
}

// isFallbackTrigger returns true for errors that should trigger a fallback.
func (r *Router) isFallbackTrigger(err error) bool {
	return errors.Is(err, ErrRateLimited) || errors.Is(err, ErrProviderUnavailable)
}

func (r *Router) completeFallback(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	if r.fallback == nil {
		return nil, ErrProviderUnavailable
	}
	return r.fallback.Complete(ctx, req)
}

func (r *Router) streamFallback(ctx context.Context, req CompletionRequest, w io.Writer) error {
	if r.fallback == nil {
		return ErrProviderUnavailable
	}
	return r.fallback.Stream(ctx, req, w)
}
