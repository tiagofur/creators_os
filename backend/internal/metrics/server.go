package metrics

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// MetricsServer serves Prometheus metrics on a separate internal port.
// This server should NOT be exposed to the public internet.
type MetricsServer struct {
	server *http.Server
}

// NewMetricsServer creates a MetricsServer that listens on the given port.
// The /metrics endpoint returns Prometheus text format.
func NewMetricsServer(port string) *MetricsServer {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())

	return &MetricsServer{
		server: &http.Server{
			Addr:         fmt.Sprintf(":%s", port),
			Handler:      mux,
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 10 * time.Second,
			IdleTimeout:  30 * time.Second,
		},
	}
}

// Start begins listening for requests. It blocks until the server encounters
// an error (returns nil if stopped via Shutdown).
func (m *MetricsServer) Start() error {
	slog.Info("metrics server starting", "addr", m.server.Addr)
	if err := m.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("metrics server: %w", err)
	}
	return nil
}

// Shutdown gracefully stops the metrics server.
func (m *MetricsServer) Shutdown(ctx context.Context) error {
	return m.server.Shutdown(ctx)
}
