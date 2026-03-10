package logger

import (
	"context"
	"log/slog"
)

type contextKey struct{}

// WithContext stores the logger in the context and returns the derived context.
// Use this in middleware to attach request-scoped fields (trace_id, user_id, etc.)
// to the logger so all downstream handlers share the same enriched logger.
func WithContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, contextKey{}, logger)
}

// FromContext retrieves the logger stored in ctx. If no logger has been stored,
// it returns slog.Default() so callers always receive a valid logger.
func FromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(contextKey{}).(*slog.Logger); ok && l != nil {
		return l
	}
	return slog.Default()
}
