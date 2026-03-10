package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/ordo/creators-os/internal/metrics"
)

// MetricsMiddleware returns a Chi-compatible HTTP middleware that records
// Prometheus metrics for each request: request count and latency.
//
// The "path" label uses the Chi route pattern (e.g. /api/v1/workspaces/{workspaceId})
// rather than the raw URL to prevent high cardinality from UUID path segments.
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status code
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		next.ServeHTTP(ww, r)

		duration := time.Since(start).Seconds()
		status := strconv.Itoa(ww.Status())

		// Use chi route pattern to avoid UUID cardinality explosion
		routePattern := chi.RouteContext(r.Context()).RoutePattern()
		if routePattern == "" {
			routePattern = r.URL.Path
		}

		labelValues := []string{r.Method, routePattern, fmt.Sprintf("%d", ww.Status())}

		metrics.HTTPRequestsTotal.WithLabelValues(labelValues...).Inc()
		metrics.HTTPRequestDuration.WithLabelValues(labelValues...).Observe(duration)

		_ = status // status captured via ww.Status()
	})
}
