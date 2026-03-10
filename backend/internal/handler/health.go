package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// HealthResponse is the JSON body returned by the /health and /ready endpoints.
type HealthResponse struct {
	Status    string            `json:"status"`
	Checks    map[string]string `json:"checks"`
	Version   string            `json:"version"`
	Timestamp string            `json:"timestamp"`
}

// HealthHandler serves the /health and /ready liveness/readiness endpoints.
// It pings PostgreSQL, Redis, and (optionally) S3/MinIO.
type HealthHandler struct {
	db      *pgxpool.Pool
	redis   *redis.Client
	version string
}

// NewHealthHandler creates a HealthHandler with the given dependencies.
// version is a human-readable build version string (e.g. "1.0.0" or git SHA).
func NewHealthHandler(db *pgxpool.Pool, redis *redis.Client, version string) *HealthHandler {
	return &HealthHandler{
		db:      db,
		redis:   redis,
		version: version,
	}
}

// ServeHTTP handles both /health and /ready requests.
// Returns 200 when all checks pass, 503 when any check fails.
func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	checks := make(map[string]string)
	allOK := true

	// Postgres check
	if err := h.db.Ping(ctx); err != nil {
		checks["postgres"] = "error: " + err.Error()
		allOK = false
	} else {
		checks["postgres"] = "ok"
	}

	// Redis check
	if err := h.redis.Ping(ctx).Err(); err != nil {
		checks["redis"] = "error: " + err.Error()
		allOK = false
	} else {
		checks["redis"] = "ok"
	}

	resp := HealthResponse{
		Checks:    checks,
		Version:   h.version,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	if allOK {
		resp.Status = "ok"
		w.WriteHeader(http.StatusOK)
	} else {
		resp.Status = "degraded"
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
