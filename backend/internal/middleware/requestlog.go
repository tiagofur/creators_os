package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/ordo/creators-os/internal/logger"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	status int
	wrote  bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.wrote {
		rw.status = code
		rw.wrote = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.wrote {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

// Unwrap allows chi middleware (e.g. middleware.WrapResponseWriter) to work correctly.
func (rw *responseWriter) Unwrap() http.ResponseWriter {
	return rw.ResponseWriter
}

// RequestLogger returns a Chi-compatible HTTP middleware that logs each request
// using structured slog. It records: trace_id, method, path, status, duration_ms.
//
// Log level by status range:
//   - 2xx / 3xx → INFO
//   - 4xx        → WARN
//   - 5xx        → ERROR
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap writer to capture status code
		ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}

		// Extract request ID injected by chi middleware.RequestID
		traceID := middleware.GetReqID(r.Context())
		if traceID == "" {
			traceID = fmt.Sprintf("req-%d", start.UnixNano())
		}

		// Attach enriched logger to context for downstream handlers
		log := logger.FromContext(r.Context()).With(
			"trace_id", traceID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		ctx := logger.WithContext(r.Context(), log)

		next.ServeHTTP(ww, r.WithContext(ctx))

		durationMs := float64(time.Since(start).Microseconds()) / 1000.0
		attrs := []any{
			"trace_id", traceID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.status,
			"duration_ms", durationMs,
		}

		switch {
		case ww.status >= 500:
			log.Error("request completed", attrs...)
		case ww.status >= 400:
			log.Warn("request completed", attrs...)
		default:
			log.Info("request completed", attrs...)
		}
	})
}
