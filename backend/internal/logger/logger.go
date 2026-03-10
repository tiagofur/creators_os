package logger

import (
	"log/slog"
	"os"
	"strings"
)

// New creates and returns a configured *slog.Logger based on the provided
// level and format strings, and whether the app is in development mode.
//
// Parameters:
//   - level: one of "debug", "info", "warn", "error" (case-insensitive). Defaults to "info".
//   - format: "json" (default) or "text" (human-readable, for local dev only).
//   - addSource: when true, source location (file/line/function) is added to each log record.
func New(level, format string, addSource bool) *slog.Logger {
	var slogLevel slog.Level
	switch strings.ToLower(level) {
	case "debug":
		slogLevel = slog.LevelDebug
	case "warn":
		slogLevel = slog.LevelWarn
	case "error":
		slogLevel = slog.LevelError
	default:
		slogLevel = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level:     slogLevel,
		AddSource: addSource,
	}

	var handler slog.Handler
	if strings.ToLower(format) == "text" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}
