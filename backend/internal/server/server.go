package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// Server wraps an http.Server and provides Start and Shutdown lifecycle methods.
type Server struct {
	httpServer *http.Server
	port       string
}

// NewServer creates a Server that will listen on the given port and serve
// requests from the provided router.
func NewServer(port string, router chi.Router) *Server {
	return &Server{
		port: port,
		httpServer: &http.Server{
			Addr:         fmt.Sprintf(":%s", port),
			Handler:      router,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}
}

// Start begins accepting connections. It blocks until the server encounters
// an error or is stopped via Shutdown. Returns nil if stopped cleanly.
func (s *Server) Start(ctx context.Context) error {
	slog.Info("api server starting", "port", s.port)
	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("server: listen: %w", err)
	}
	return nil
}

// Shutdown gracefully stops the server, waiting up to the deadline in ctx
// for in-flight requests to complete.
func (s *Server) Shutdown(ctx context.Context) error {
	slog.Info("api server shutting down")
	return s.httpServer.Shutdown(ctx)
}
