# Go Coding Conventions — Ordo Creator OS Backend

**Team coding standards for consistency, maintainability, and reliability**

Last Updated: 2026-03-10
Go Version: 1.21+
Style: Pragmatic, opinionated, team-enforced
Tooling: golangci-lint, sqlc, chi

---

## Table of Contents

1. [Error Handling](#1-error-handling)
2. [Logging](#2-logging)
3. [Request/Response Patterns](#3-requestresponse-patterns)
4. [Service Layer Patterns](#4-service-layer-patterns)
5. [Repository Layer Patterns](#5-repository-layer-patterns)
6. [Handler Layer Patterns](#6-handler-layer-patterns)
7. [Dependency Injection](#7-dependency-injection)
8. [Naming Conventions](#8-naming-conventions)
9. [Context Usage](#9-context-usage)
10. [Concurrency Patterns](#10-concurrency-patterns)
11. [Code Organization Rules](#11-code-organization-rules)
12. [golangci-lint Configuration](#12-golangci-lint-configuration)

---

## 1. Error Handling

### Philosophy

Errors are part of your API contract. Never leak internal implementation details to clients. All errors flowing to HTTP clients must be translated to domain-aware error types that map cleanly to HTTP status codes and client-friendly messages.

### Custom Error Types

Define a single canonical error type that all services and handlers use:

```go
// internal/domain/errors.go
package domain

import (
	"fmt"
	"net/http"
)

// AppError represents a structured application error with HTTP semantics.
type AppError struct {
	// Code is a unique error identifier (e.g., "IDEA_NOT_FOUND", "INVALID_INPUT")
	Code string
	
	// Message is a user-friendly description, safe to return in HTTP responses
	Message string
	
	// HTTPStatus is the HTTP status code to return (e.g., 404, 400, 500)
	HTTPStatus int
	
	// Details contains additional context for logging/debugging (never exposed to clients)
	Details string
	
	// Err is the underlying error from lower layers (for error chain inspection)
	Err error
}

// Error implements the error interface.
func (ae *AppError) Error() string {
	if ae.Err != nil {
		return fmt.Sprintf("%s: %v", ae.Message, ae.Err)
	}
	return ae.Message
}

// Unwrap allows errors.Is/As to inspect the chain.
func (ae *AppError) Unwrap() error {
	return ae.Err
}

// Is enables errors.Is(err, ErrNotFound) comparison.
func (ae *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return ae.Code == t.Code
}
```

### Sentinel Error Definitions

Pre-define common errors to avoid repeated creation:

```go
// internal/domain/errors.go (continued)

var (
	// ErrNotFound signals a resource does not exist.
	ErrNotFound = &AppError{
		Code:       "NOT_FOUND",
		Message:    "Resource not found",
		HTTPStatus: http.StatusNotFound,
	}

	// ErrUnauthorized signals missing or invalid authentication.
	ErrUnauthorized = &AppError{
		Code:       "UNAUTHORIZED",
		Message:    "Authentication required or invalid",
		HTTPStatus: http.StatusUnauthorized,
	}

	// ErrForbidden signals valid auth but insufficient permissions.
	ErrForbidden = &AppError{
		Code:       "FORBIDDEN",
		Message:    "Insufficient permissions",
		HTTPStatus: http.StatusForbidden,
	}

	// ErrValidation signals invalid request data.
	ErrValidation = &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    "Invalid input",
		HTTPStatus: http.StatusBadRequest,
	}

	// ErrConflict signals a resource state conflict (e.g., duplicate key).
	ErrConflict = &AppError{
		Code:       "CONFLICT",
		Message:    "Resource conflict",
		HTTPStatus: http.StatusConflict,
	}

	// ErrInternal signals an unexpected server error.
	ErrInternal = &AppError{
		Code:       "INTERNAL_ERROR",
		Message:    "An error occurred",
		HTTPStatus: http.StatusInternalServerError,
	}
)
```

### Error Creation Helpers

Create specialized constructors for domain-specific errors:

```go
// internal/domain/errors.go (continued)

// NewNotFound creates a NOT_FOUND error with custom message.
func NewNotFound(message string) *AppError {
	return &AppError{
		Code:       "NOT_FOUND",
		Message:    message,
		HTTPStatus: http.StatusNotFound,
	}
}

// NewUnauthorized creates an UNAUTHORIZED error with context.
func NewUnauthorized(details string) *AppError {
	return &AppError{
		Code:       "UNAUTHORIZED",
		Message:    "Authentication required or invalid",
		HTTPStatus: http.StatusUnauthorized,
		Details:    details,
	}
}

// NewValidation creates a VALIDATION_ERROR with details.
func NewValidation(message, details string) *AppError {
	return &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    message,
		HTTPStatus: http.StatusBadRequest,
		Details:    details,
	}
}

// NewConflict creates a CONFLICT error (e.g., duplicate unique key).
func NewConflict(message, details string) *AppError {
	return &AppError{
		Code:       "CONFLICT",
		Message:    message,
		HTTPStatus: http.StatusConflict,
		Details:    details,
	}
}

// Wrap wraps an existing error with context and maps it to an AppError.
func Wrap(err error, code, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
		Err:        err,
		Details:    err.Error(),
	}
}
```

### Error Wrapping in Services

Always wrap errors with context before returning, using `fmt.Errorf` with `%w`:

```go
// internal/service/idea_service.go
package service

import (
	"context"
	"fmt"
	"github.com/rs/zerolog/log"
	"ordo/internal/domain"
	"ordo/internal/repository"
)

type IdeaService struct {
	repo   repository.IdeaRepository
	logger zerolog.Logger
}

func NewIdeaService(repo repository.IdeaRepository, logger zerolog.Logger) *IdeaService {
	return &IdeaService{
		repo:   repo,
		logger: logger,
	}
}

// GetIdea retrieves an idea by ID or returns domain-aware error.
func (s *IdeaService) GetIdea(ctx context.Context, ideaID string) (*domain.Idea, error) {
	idea, err := s.repo.GetByID(ctx, ideaID)
	if err != nil {
		// Wrap lower-layer errors with domain context
		if err == repository.ErrNotFound {
			return nil, domain.NewNotFound(fmt.Sprintf("Idea %q not found", ideaID))
		}
		// Unexpected DB error
		s.logger.Error().Err(err).Str("idea_id", ideaID).Msg("Failed to fetch idea")
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to retrieve idea", 500)
	}
	return idea, nil
}

// CreateIdea validates business rules and returns domain-aware errors.
func (s *IdeaService) CreateIdea(ctx context.Context, userID string, req *domain.CreateIdeaRequest) (*domain.Idea, error) {
	// Validate business rules (not HTTP concerns)
	if req.Title == "" {
		return nil, domain.NewValidation("Title is required", "")
	}
	if len(req.Title) > 200 {
		return nil, domain.NewValidation("Title exceeds 200 characters", fmt.Sprintf("provided: %d", len(req.Title)))
	}

	// Call repository
	idea := &domain.Idea{
		Title:   req.Title,
		UserID:  userID,
		Status:  domain.IdeaDraft,
	}
	if err := s.repo.Create(ctx, idea); err != nil {
		s.logger.Error().Err(err).Str("user_id", userID).Msg("Failed to create idea")
		// Check for specific database errors
		if err.Error() == "unique constraint violation" {
			return nil, domain.NewConflict("Title already exists", "")
		}
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to create idea", 500)
	}

	return idea, nil
}
```

### Handler Error Translation

Handlers translate domain errors to HTTP responses without leaking implementation:

```go
// internal/handler/idea_handler.go
package handler

import (
	"encoding/json"
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
	"ordo/internal/domain"
	"ordo/internal/service"
	"ordo/pkg/respond"
)

type IdeaHandler struct {
	ideaService *service.IdeaService
	logger      zerolog.Logger
}

func NewIdeaHandler(ideaService *service.IdeaService, logger zerolog.Logger) *IdeaHandler {
	return &IdeaHandler{
		ideaService: ideaService,
		logger:      logger,
	}
}

// GetIdea handles GET /ideas/{id}
func (h *IdeaHandler) GetIdea(w http.ResponseWriter, r *http.Request) {
	ideaID := chi.URLParam(r, "id")
	if ideaID == "" {
		respond.Error(w, domain.NewValidation("Idea ID is required", ""))
		return
	}

	idea, err := h.ideaService.GetIdea(r.Context(), ideaID)
	if err != nil {
		// Handler translates domain error to HTTP response
		respondAppError(w, err, h.logger)
		return
	}

	respond.JSON(w, http.StatusOK, idea)
}

// CreateIdea handles POST /ideas
func (h *IdeaHandler) CreateIdea(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req domain.CreateIdeaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn().Err(err).Msg("Failed to decode request body")
		respond.Error(w, domain.NewValidation("Invalid JSON", err.Error()))
		return
	}

	userID := r.Context().Value("user_id").(string) // Injected by auth middleware

	idea, err := h.ideaService.CreateIdea(r.Context(), userID, &req)
	if err != nil {
		respondAppError(w, err, h.logger)
		return
	}

	respond.JSON(w, http.StatusCreated, idea)
}

// respondAppError is the canonical error translator: domain error → HTTP response
func respondAppError(w http.ResponseWriter, err error, logger zerolog.Logger) {
	appErr, ok := err.(*domain.AppError)
	if !ok {
		// Unexpected error type; treat as internal error
		logger.Error().Err(err).Msg("Non-AppError returned to HTTP handler")
		appErr = domain.ErrInternal
	}

	// Log full details for debugging
	logger.Error().
		Str("code", appErr.Code).
		Int("status", appErr.HTTPStatus).
		Str("details", appErr.Details).
		Err(appErr.Err).
		Msg("Request error")

	// Return only user-safe message
	respond.Error(w, appErr)
}
```

### Error Response Package

Create a response helper for consistent error formatting:

```go
// pkg/respond/respond.go
package respond

import (
	"encoding/json"
	"net/http"
	"ordo/internal/domain"
)

// ErrorResponse is the HTTP error response body.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSON writes a successful JSON response.
func JSON(w http.ResponseWriter, status int, data interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(data)
}

// Error writes an error response from a domain error.
func Error(w http.ResponseWriter, err error) error {
	appErr, ok := err.(*domain.AppError)
	if !ok {
		appErr = domain.ErrInternal
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.HTTPStatus)

	return json.NewEncoder(w).Encode(ErrorResponse{
		Code:    appErr.Code,
		Message: appErr.Message,
	})
}
```

---

## 2. Logging

### Philosophy

Logging is a first-class citizen. Use structured JSON logging (zerolog) everywhere. Every log entry must be parseable by your observability pipeline. Never log sensitive data.

### Library: zerolog

```bash
go get github.com/rs/zerolog
```

### Log Levels & Usage

- **debug**: Development-only detailed traces. Disable in production.
- **info**: Important business events (user signup, content published, workflow completed).
- **warn**: Recoverable errors that may indicate degradation (retry after failure, cache miss).
- **error**: Unexpected errors that require investigation (DB query failed, service unavailable).
- **fatal**: Startup errors that prevent the application from running.

### Logger Setup in main.go

```go
// cmd/api/main.go
package main

import (
	"os"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func init() {
	// Pretty-print logs in development
	if os.Getenv("ENV") == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	} else {
		// JSON logs in production
		log.Logger = log.With().Caller().Stack().Logger()
	}

	// Set log level from env (default: info)
	levelStr := os.Getenv("LOG_LEVEL")
	if levelStr == "" {
		levelStr = "info"
	}
	level, _ := zerolog.ParseLevel(levelStr)
	zerolog.SetGlobalLevel(level)
}
```

### Request Logging Middleware

Log every HTTP request with timing and status:

```go
// internal/middleware/logger.go
package middleware

import (
	"net/http"
	"time"
	"github.com/rs/zerolog/log"
)

// RequestLogger logs HTTP requests and responses.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Capture the response status with a response writer wrapper
		wrapped := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Get request ID from context (set by earlier middleware)
		requestID := r.Context().Value("request_id")
		if requestID == nil {
			requestID = "unknown"
		}

		// Log incoming request
		log.Info().
			Str("request_id", requestID.(string)).
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Str("query", r.URL.RawQuery).
			Msg("Request received")

		// Time the request
		start := time.Now()
		defer func() {
			duration := time.Since(start)

			log.Info().
				Str("request_id", requestID.(string)).
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", wrapped.statusCode).
				Dur("duration_ms", duration).
				Msg("Request completed")
		}()

		next.ServeHTTP(wrapped, r)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
```

### Request ID & Context Logging

Inject request ID via middleware and extract in handlers/services:

```go
// internal/middleware/requestid.go
package middleware

import (
	"context"
	"net/http"
	"github.com/google/uuid"
)

// RequestID injects a unique request ID into context.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check for existing request ID (e.g., from load balancer)
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}

		// Inject into context
		ctx := context.WithValue(r.Context(), "request_id", reqID)

		// Return to caller for tracing
		w.Header().Set("X-Request-ID", reqID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

### Context-Aware Logging in Services

Extract request ID from context for correlated logging:

```go
// internal/service/idea_service.go (logging pattern)
package service

import (
	"context"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func (s *IdeaService) PublishIdea(ctx context.Context, ideaID string) error {
	// Extract request ID from context for correlated logging
	requestID := ctx.Value("request_id")

	// Create a child logger with request context
	logger := log.With().
		Str("request_id", toString(requestID)).
		Str("idea_id", ideaID).
		Logger()

	logger.Info().Msg("Publishing idea")

	// Do work...
	if err := s.repo.UpdateStatus(ctx, ideaID, domain.IdeaPublished); err != nil {
		logger.Error().Err(err).Msg("Failed to publish idea")
		return err
	}

	logger.Info().Msg("Idea published successfully")
	return nil
}

func toString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return "unknown"
}
```

### What to Log vs. What NOT to Log

**DO LOG:**
- Incoming HTTP requests (method, path, status, duration)
- Outgoing external API calls (service, method, latency)
- Business events (user registered, content published, workflow started)
- Errors and exceptional conditions
- Performance metrics (database query time, cache hit/miss)

**DO NOT LOG:**
- Request/response bodies (even in debug)
- Passwords, API tokens, or credentials
- Personally identifiable information (PII)
- Full error stack traces in production (log.WithStack() selectively)
- Sensitive query parameters (auth tokens, session IDs)

**Example: Safe Logging**

```go
// GOOD: Log meaningful context, not sensitive data
logger.Info().
	Str("user_id", userID).
	Str("workspace_id", wsID).
	Int("content_count", count).
	Msg("User generated content")

// BAD: Logging sensitive data
logger.Info().
	Str("auth_token", token).
	Str("password", password).
	Msg("Login attempt")

// GOOD: Log errors with context, not raw response bodies
logger.Error().
	Err(err).
	Int("status_code", resp.StatusCode).
	Msg("External API call failed")

// BAD: Logging the full response
logger.Error().
	Err(err).
	Str("response_body", respBody). // Could contain sensitive data
	Msg("External API call failed")
```

---

## 3. Request/Response Patterns

### Request Validation with Struct Tags

Define request structs with validation tags using `go-playground/validator`:

```bash
go get github.com/go-playground/validator/v10
```

```go
// internal/domain/requests.go
package domain

// CreateIdeaRequest is the HTTP request body for POST /ideas
type CreateIdeaRequest struct {
	// Title is the idea title (required, max 200 chars)
	Title string `json:"title" validate:"required,max=200"`

	// Description is optional expanded detail (max 2000 chars)
	Description string `json:"description" validate:"omitempty,max=2000"`

	// Category is a predefined category (required)
	Category string `json:"category" validate:"required,oneof=tech health lifestyle education business"`

	// Tags are optional metadata (max 10)
	Tags []string `json:"tags" validate:"max=10,dive,max=50"`

	// Status is optional (defaults to DRAFT)
	Status string `json:"status" validate:"omitempty,oneof=DRAFT PUBLISHED"`
}

// UpdateIdeaRequest is the HTTP request body for PATCH /ideas/{id}
type UpdateIdeaRequest struct {
	Title       *string   `json:"title" validate:"omitempty,max=200"`
	Description *string   `json:"description" validate:"omitempty,max=2000"`
	Status      *string   `json:"status" validate:"omitempty,oneof=DRAFT PUBLISHED ARCHIVED"`
	Tags        *[]string `json:"tags" validate:"omitempty,max=10,dive,max=50"`
}

// CreateContentRequest is the HTTP request body for POST /content
type CreateContentRequest struct {
	Title     string `json:"title" validate:"required,max=500"`
	Format    string `json:"format" validate:"required,oneof=blog video podcast social"`
	IdeaID    string `json:"idea_id" validate:"required,uuid"`
	DraftText string `json:"draft_text" validate:"omitempty,max=50000"`
}
```

### Request Parsing & Validation in Handlers

```go
// internal/handler/idea_handler.go
package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"github.com/go-playground/validator/v10"
	"ordo/internal/domain"
	"ordo/pkg/respond"
)

type IdeaHandler struct {
	validator *validator.Validate
	// ... other fields
}

// CreateIdea handles POST /ideas with validation
func (h *IdeaHandler) CreateIdea(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 1MB to prevent DoS
	defer r.Body.Close()
	reader := io.LimitReader(r.Body, 1*1024*1024)

	var req domain.CreateIdeaRequest
	if err := json.NewDecoder(reader).Decode(&req); err != nil {
		// JSON parse error
		respond.Error(w, domain.NewValidation("Invalid JSON", err.Error()))
		return
	}

	// Validate request against struct tags
	if err := h.validator.Struct(req); err != nil {
		validationErrors := err.(validator.ValidationErrors)
		details := formatValidationErrors(validationErrors)
		respond.Error(w, domain.NewValidation("Validation failed", details))
		return
	}

	// Proceed to service layer
	userID := r.Context().Value("user_id").(string)
	idea, err := h.ideaService.CreateIdea(r.Context(), userID, &req)
	if err != nil {
		respondAppError(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, idea)
}

// formatValidationErrors converts validator errors to a readable string.
func formatValidationErrors(validationErrors validator.ValidationErrors) string {
	var details string
	for _, err := range validationErrors {
		details += err.Field() + " failed validation: " + err.Tag() + "; "
	}
	return details
}

// UpdateIdea handles PATCH /ideas/{id}
func (h *IdeaHandler) UpdateIdea(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	ideaID := chi.URLParam(r, "id")
	if ideaID == "" {
		respond.Error(w, domain.NewValidation("Idea ID is required", ""))
		return
	}

	var req domain.UpdateIdeaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, domain.NewValidation("Invalid JSON", err.Error()))
		return
	}

	if err := h.validator.Struct(req); err != nil {
		validationErrors := err.(validator.ValidationErrors)
		respond.Error(w, domain.NewValidation("Validation failed", formatValidationErrors(validationErrors)))
		return
	}

	userID := r.Context().Value("user_id").(string)
	idea, err := h.ideaService.UpdateIdea(r.Context(), userID, ideaID, &req)
	if err != nil {
		respondAppError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, idea)
}
```

### Response Helpers

Centralize response writing:

```go
// pkg/respond/respond.go
package respond

import (
	"encoding/json"
	"net/http"
	"ordo/internal/domain"
)

// JSON writes a successful JSON response with status code.
func JSON(w http.ResponseWriter, status int, data interface{}) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(data)
}

// Error writes an error response, extracting AppError details.
func Error(w http.ResponseWriter, err error) error {
	appErr, ok := err.(*domain.AppError)
	if !ok {
		appErr = domain.ErrInternal
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(appErr.HTTPStatus)

	return json.NewEncoder(w).Encode(map[string]interface{}{
		"code":    appErr.Code,
		"message": appErr.Message,
	})
}

// Paginated writes a paginated response with cursor-based pagination.
func Paginated(w http.ResponseWriter, status int, items interface{}, pageInfo *domain.PageInfo) error {
	response := map[string]interface{}{
		"items":      items,
		"page_info":  pageInfo,
	}
	return JSON(w, status, response)
}
```

### Pagination: Cursor-Based (Not Offset-Based)

Cursor-based pagination is more efficient and resilient to concurrent updates:

```go
// internal/domain/pagination.go
package domain

import "encoding/base64"

// Cursor represents a position in a sorted result set (base64-encoded).
type Cursor string

// PageInfo holds pagination metadata.
type PageInfo struct {
	// HasNextPage indicates whether more results exist.
	HasNextPage bool `json:"has_next_page"`

	// NextCursor is the opaque cursor to fetch the next page (if HasNextPage=true).
	NextCursor Cursor `json:"next_cursor"`

	// Count is the number of items in the current page.
	Count int `json:"count"`
}

// PaginatedResponse wraps items with pagination info.
type PaginatedResponse struct {
	Items    interface{} `json:"items"`
	PageInfo *PageInfo   `json:"page_info"`
}

// EncodeCursor encodes a position value (e.g., ID, timestamp) into a cursor.
func EncodeCursor(value string) Cursor {
	return Cursor(base64.StdEncoding.EncodeToString([]byte(value)))
}

// DecodeCursor decodes a cursor back to its position value.
func DecodeCursor(c Cursor) (string, error) {
	bytes, err := base64.StdEncoding.DecodeString(string(c))
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// FetchParams holds query parameters for paginated list endpoints.
type FetchParams struct {
	// Limit is the maximum number of items to return (default: 20, max: 100).
	Limit int
	
	// Cursor is the pagination cursor from the previous response.
	Cursor Cursor
}
```

**Handler using pagination:**

```go
// internal/handler/idea_handler.go
func (h *IdeaHandler) ListIdeas(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	cursor := domain.Cursor(r.URL.Query().Get("cursor"))

	// Fetch from service (limit + 1 to detect if next page exists)
	userID := r.Context().Value("user_id").(string)
	ideas, err := h.ideaService.ListIdeas(r.Context(), userID, limit+1, cursor)
	if err != nil {
		respondAppError(w, err)
		return
	}

	// Determine if there's a next page
	hasNextPage := len(ideas) > limit
	if hasNextPage {
		ideas = ideas[:limit] // Return only the requested limit
	}

	pageInfo := &domain.PageInfo{
		HasNextPage: hasNextPage,
		Count:       len(ideas),
	}

	if hasNextPage && len(ideas) > 0 {
		// Cursor points to the last item's ID
		lastIdea := ideas[len(ideas)-1]
		pageInfo.NextCursor = domain.EncodeCursor(lastIdea.ID)
	}

	respond.Paginated(w, http.StatusOK, ideas, pageInfo)
}
```

---

## 4. Service Layer Patterns

### Philosophy

Services contain all business logic. They are decoupled from HTTP concerns, making them testable and reusable. Services accept interfaces (not concrete types) for dependencies, enabling easy mocking in tests.

### Service Structure

```go
// internal/service/idea_service.go
package service

import (
	"context"
	"fmt"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"ordo/internal/domain"
	"ordo/internal/repository"
)

// IdeaRepository defines data access for ideas.
// Services depend on interfaces, not implementations.
type IdeaRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Idea, error)
	Create(ctx context.Context, idea *domain.Idea) error
	Update(ctx context.Context, idea *domain.Idea) error
	Delete(ctx context.Context, id string) error
	ListByUser(ctx context.Context, userID string, limit int, cursor domain.Cursor) ([]*domain.Idea, error)
}

// AIProvider represents an external AI service.
type AIProvider interface {
	GenerateTitle(ctx context.Context, prompt string) (string, error)
}

// IdeaService owns all idea-related business logic.
type IdeaService struct {
	repo   IdeaRepository
	ai     AIProvider
	logger zerolog.Logger
}

// NewIdeaService constructs an IdeaService with required dependencies.
func NewIdeaService(
	repo IdeaRepository,
	ai AIProvider,
	logger zerolog.Logger,
) *IdeaService {
	return &IdeaService{
		repo:   repo,
		ai:     ai,
		logger: logger,
	}
}

// GetIdea retrieves an idea by ID.
// Context is always the first parameter for cancellation and timeouts.
func (s *IdeaService) GetIdea(ctx context.Context, ideaID string) (*domain.Idea, error) {
	idea, err := s.repo.GetByID(ctx, ideaID)
	if err != nil {
		if err == repository.ErrNotFound {
			return nil, domain.NewNotFound(fmt.Sprintf("Idea %q not found", ideaID))
		}
		s.logger.Error().Err(err).Str("idea_id", ideaID).Msg("Repository error")
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to retrieve idea", 500)
	}
	return idea, nil
}

// CreateIdea creates a new idea with business rule validation.
func (s *IdeaService) CreateIdea(
	ctx context.Context,
	userID string,
	req *domain.CreateIdeaRequest,
) (*domain.Idea, error) {
	// Validate business rules (not HTTP concerns)
	if err := s.validateIdeaInput(req); err != nil {
		return nil, err
	}

	// Create domain object
	idea := &domain.Idea{
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
		Tags:        req.Tags,
		UserID:      userID,
		Status:      domain.IdeaDraft,
	}

	// If category is "tech", use AI to enhance title
	if req.Category == "tech" {
		enhanced, err := s.ai.GenerateTitle(ctx, req.Title)
		if err != nil {
			s.logger.Warn().Err(err).Msg("AI title generation failed; using original")
		} else {
			idea.Title = enhanced
		}
	}

	// Persist to database
	if err := s.repo.Create(ctx, idea); err != nil {
		s.logger.Error().Err(err).Msg("Failed to create idea")
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to create idea", 500)
	}

	s.logger.Info().
		Str("idea_id", idea.ID).
		Str("user_id", userID).
		Str("category", idea.Category).
		Msg("Idea created")

	return idea, nil
}

// PublishIdea marks an idea as published and enforces business rules.
func (s *IdeaService) PublishIdea(ctx context.Context, userID, ideaID string) (*domain.Idea, error) {
	idea, err := s.repo.GetByID(ctx, ideaID)
	if err != nil {
		if err == repository.ErrNotFound {
			return nil, domain.NewNotFound(fmt.Sprintf("Idea %q not found", ideaID))
		}
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to retrieve idea", 500)
	}

	// Business rule: Only author can publish
	if idea.UserID != userID {
		return nil, domain.NewForbidden("Only the author can publish this idea")
	}

	// Business rule: Can only publish drafts
	if idea.Status != domain.IdeaDraft {
		return nil, domain.NewConflict(
			fmt.Sprintf("Cannot publish idea with status %s", idea.Status),
			"",
		)
	}

	// Update status
	idea.Status = domain.IdeaPublished
	if err := s.repo.Update(ctx, idea); err != nil {
		s.logger.Error().Err(err).Msg("Failed to publish idea")
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to publish idea", 500)
	}

	s.logger.Info().
		Str("idea_id", ideaID).
		Str("user_id", userID).
		Msg("Idea published")

	return idea, nil
}

// ListIdeas lists ideas for a user with pagination.
func (s *IdeaService) ListIdeas(
	ctx context.Context,
	userID string,
	limit int,
	cursor domain.Cursor,
) ([]*domain.Idea, error) {
	// Enforce reasonable limits
	if limit < 1 || limit > 100 {
		limit = 20
	}

	ideas, err := s.repo.ListByUser(ctx, userID, limit, cursor)
	if err != nil {
		s.logger.Error().Err(err).Str("user_id", userID).Msg("Failed to list ideas")
		return nil, domain.Wrap(err, "DB_ERROR", "Failed to list ideas", 500)
	}

	return ideas, nil
}

// validateIdeaInput enforces input constraints before persistence.
func (s *IdeaService) validateIdeaInput(req *domain.CreateIdeaRequest) error {
	if req.Title == "" {
		return domain.NewValidation("Title is required", "")
	}
	if len(req.Title) > 200 {
		return domain.NewValidation("Title exceeds maximum length", fmt.Sprintf("max: 200, got: %d", len(req.Title)))
	}
	if len(req.Tags) > 10 {
		return domain.NewValidation("Too many tags", fmt.Sprintf("max: 10, got: %d", len(req.Tags)))
	}
	return nil
}
```

### Service Testing Pattern

Services are tested by mocking repository interfaces:

```go
// internal/service/idea_service_test.go
package service

import (
	"context"
	"errors"
	"testing"
	"github.com/rs/zerolog"
	"ordo/internal/domain"
)

// mockIdeaRepository implements IdeaRepository for testing.
type mockIdeaRepository struct {
	getByIDFn func(ctx context.Context, id string) (*domain.Idea, error)
	createFn  func(ctx context.Context, idea *domain.Idea) error
}

func (m *mockIdeaRepository) GetByID(ctx context.Context, id string) (*domain.Idea, error) {
	return m.getByIDFn(ctx, id)
}

func (m *mockIdeaRepository) Create(ctx context.Context, idea *domain.Idea) error {
	return m.createFn(ctx, idea)
}

func TestCreateIdea_Valid(t *testing.T) {
	mockRepo := &mockIdeaRepository{
		createFn: func(ctx context.Context, idea *domain.Idea) error {
			idea.ID = "test-123"
			return nil
		},
	}

	service := NewIdeaService(mockRepo, nil, zerolog.Logger{})

	req := &domain.CreateIdeaRequest{
		Title:       "Test Idea",
		Category:    "tech",
		Description: "A test idea",
	}

	idea, err := service.CreateIdea(context.Background(), "user-1", req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if idea.ID == "" {
		t.Fatal("Expected idea ID to be set")
	}
}

func TestCreateIdea_ValidationError(t *testing.T) {
	service := NewIdeaService(nil, nil, zerolog.Logger{})

	req := &domain.CreateIdeaRequest{
		Title: "", // Missing required field
	}

	_, err := service.CreateIdea(context.Background(), "user-1", req)
	if err == nil {
		t.Fatal("Expected validation error")
	}

	appErr, ok := err.(*domain.AppError)
	if !ok {
		t.Fatalf("Expected AppError, got %T", err)
	}
	if appErr.Code != "VALIDATION_ERROR" {
		t.Fatalf("Expected VALIDATION_ERROR, got %s", appErr.Code)
	}
}
```

---

## 5. Repository Layer Patterns

### Philosophy

Repositories provide data access abstraction. They wrap sqlc-generated code and implement interfaces defined by services. This decoupling allows services to be tested without a database.

### Repository Interface & Implementation

```go
// internal/repository/idea_repository.go
package repository

import (
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"ordo/internal/domain"
	"ordo/internal/repository/sqlc"
)

// Sentinel error for not found
var ErrNotFound = errors.New("not found")

// IdeaRepository provides data access for ideas.
type IdeaRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Idea, error)
	Create(ctx context.Context, idea *domain.Idea) error
	Update(ctx context.Context, idea *domain.Idea) error
	Delete(ctx context.Context, id string) error
	ListByUser(ctx context.Context, userID string, limit int, cursor domain.Cursor) ([]*domain.Idea, error)
}

// ideaRepository implements IdeaRepository.
type ideaRepository struct {
	pool   *pgxpool.Pool
	queries *sqlc.Queries // sqlc-generated code
}

// NewIdeaRepository constructs an idea repository.
func NewIdeaRepository(pool *pgxpool.Pool) IdeaRepository {
	return &ideaRepository{
		pool:    pool,
		queries: sqlc.New(pool),
	}
}

// GetByID fetches an idea by ID.
func (r *ideaRepository) GetByID(ctx context.Context, id string) (*domain.Idea, error) {
	row, err := r.queries.GetIdeaByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		log.Error().Err(err).Str("id", id).Msg("GetByID database error")
		return nil, err
	}

	return &domain.Idea{
		ID:          row.ID,
		Title:       row.Title,
		Description: row.Description,
		Category:    row.Category,
		Status:      row.Status,
		UserID:      row.UserID,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}, nil
}

// Create inserts a new idea.
func (r *ideaRepository) Create(ctx context.Context, idea *domain.Idea) error {
	err := withTx(ctx, r.pool, func(tx pgx.Tx) error {
		queries := sqlc.New(tx)
		_, err := queries.CreateIdea(ctx, sqlc.CreateIdeaParams{
			ID:          idea.ID,
			Title:       idea.Title,
			Description: idea.Description,
			Category:    idea.Category,
			Status:      idea.Status,
			UserID:      idea.UserID,
		})
		if err != nil {
			log.Error().Err(err).Msg("CreateIdea database error")
			return err
		}
		return nil
	})
	return err
}

// Update modifies an existing idea.
func (r *ideaRepository) Update(ctx context.Context, idea *domain.Idea) error {
	err := withTx(ctx, r.pool, func(tx pgx.Tx) error {
		queries := sqlc.New(tx)
		err := queries.UpdateIdea(ctx, sqlc.UpdateIdeaParams{
			ID:          idea.ID,
			Title:       idea.Title,
			Description: idea.Description,
			Status:      idea.Status,
		})
		if err != nil {
			log.Error().Err(err).Msg("UpdateIdea database error")
			return err
		}
		return nil
	})
	return err
}

// Delete removes an idea.
func (r *ideaRepository) Delete(ctx context.Context, id string) error {
	err := r.queries.DeleteIdea(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("DeleteIdea database error")
	}
	return err
}

// ListByUser lists ideas for a user with cursor-based pagination.
func (r *ideaRepository) ListByUser(
	ctx context.Context,
	userID string,
	limit int,
	cursor domain.Cursor,
) ([]*domain.Idea, error) {
	// Decode cursor to get starting position (e.g., created_at timestamp)
	startID := ""
	if cursor != "" {
		var err error
		startID, err = domain.DecodeCursor(cursor)
		if err != nil {
			log.Warn().Err(err).Msg("Invalid cursor")
			startID = ""
		}
	}

	rows, err := r.queries.ListIdeasByUser(ctx, sqlc.ListIdeasByUserParams{
		UserID: userID,
		Limit:  int32(limit + 1), // Fetch one extra to detect next page
		Offset: 0,
		// In production, use cursor-based WHERE clause instead of OFFSET
	})
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("ListByUser database error")
		return nil, err
	}

	ideas := make([]*domain.Idea, len(rows))
	for i, row := range rows {
		ideas[i] = &domain.Idea{
			ID:        row.ID,
			Title:     row.Title,
			Category:  row.Category,
			Status:    row.Status,
			UserID:    row.UserID,
			CreatedAt: row.CreatedAt,
		}
	}

	return ideas, nil
}

// withTx executes a function within a database transaction.
// Automatically commits on success or rolls back on error.
func withTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) // No-op if already committed

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
```

### Using sqlc for Type-Safe SQL

```sql
-- internal/repository/queries/idea.sql

-- name: GetIdeaByID :one
SELECT id, title, description, category, status, user_id, created_at, updated_at
FROM ideas
WHERE id = $1;

-- name: CreateIdea :one
INSERT INTO ideas (id, title, description, category, status, user_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
RETURNING id, title, description, category, status, user_id, created_at, updated_at;

-- name: UpdateIdea :exec
UPDATE ideas
SET title = $2, description = $3, status = $4, updated_at = NOW()
WHERE id = $1;

-- name: DeleteIdea :exec
DELETE FROM ideas WHERE id = $1;

-- name: ListIdeasByUser :many
SELECT id, title, description, category, status, user_id, created_at, updated_at
FROM ideas
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

---

## 6. Handler Layer Patterns

### Philosophy

Handlers are thin layers between HTTP and business logic. They parse requests, validate, call services, and translate responses. Handlers never contain business logic.

### Complete Handler Example

```go
// internal/handler/idea_handler.go
package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"ordo/internal/domain"
	"ordo/internal/service"
	"ordo/pkg/respond"
)

// IdeaHandler handles HTTP requests for ideas.
type IdeaHandler struct {
	ideaService *service.IdeaService
	validator   *validator.Validate
	logger      zerolog.Logger
}

// NewIdeaHandler constructs an idea handler.
func NewIdeaHandler(
	ideaService *service.IdeaService,
	validator *validator.Validate,
	logger zerolog.Logger,
) *IdeaHandler {
	return &IdeaHandler{
		ideaService: ideaService,
		validator:   validator,
		logger:      logger,
	}
}

// CreateIdea handles POST /ideas
func (h *IdeaHandler) CreateIdea(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// Parse JSON request (with size limit)
	reader := io.LimitReader(r.Body, 1*1024*1024) // 1MB limit
	var req domain.CreateIdeaRequest
	if err := json.NewDecoder(reader).Decode(&req); err != nil {
		h.logger.Warn().Err(err).Msg("Failed to decode request")
		respondError(w, domain.NewValidation("Invalid JSON", err.Error()), h.logger)
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		h.logger.Debug().Err(err).Msg("Request validation failed")
		respondError(w, domain.NewValidation("Validation failed", formatErrors(err)), h.logger)
		return
	}

	// Extract user from context (set by auth middleware)
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		respondError(w, domain.ErrUnauthorized, h.logger)
		return
	}

	// Call service
	idea, err := h.ideaService.CreateIdea(r.Context(), userID, &req)
	if err != nil {
		respondError(w, err, h.logger)
		return
	}

	// Success response
	respond.JSON(w, http.StatusCreated, idea)
}

// GetIdea handles GET /ideas/{id}
func (h *IdeaHandler) GetIdea(w http.ResponseWriter, r *http.Request) {
	ideaID := chi.URLParam(r, "id")
	if ideaID == "" {
		respondError(w, domain.NewValidation("Idea ID is required", ""), h.logger)
		return
	}

	idea, err := h.ideaService.GetIdea(r.Context(), ideaID)
	if err != nil {
		respondError(w, err, h.logger)
		return
	}

	respond.JSON(w, http.StatusOK, idea)
}

// UpdateIdea handles PATCH /ideas/{id}
func (h *IdeaHandler) UpdateIdea(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	ideaID := chi.URLParam(r, "id")
	if ideaID == "" {
		respondError(w, domain.NewValidation("Idea ID is required", ""), h.logger)
		return
	}

	var req domain.UpdateIdeaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, domain.NewValidation("Invalid JSON", err.Error()), h.logger)
		return
	}

	if err := h.validator.Struct(req); err != nil {
		respondError(w, domain.NewValidation("Validation failed", formatErrors(err)), h.logger)
		return
	}

	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		respondError(w, domain.ErrUnauthorized, h.logger)
		return
	}

	idea, err := h.ideaService.UpdateIdea(r.Context(), userID, ideaID, &req)
	if err != nil {
		respondError(w, err, h.logger)
		return
	}

	respond.JSON(w, http.StatusOK, idea)
}

// PublishIdea handles POST /ideas/{id}/publish
func (h *IdeaHandler) PublishIdea(w http.ResponseWriter, r *http.Request) {
	ideaID := chi.URLParam(r, "id")
	if ideaID == "" {
		respondError(w, domain.NewValidation("Idea ID is required", ""), h.logger)
		return
	}

	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		respondError(w, domain.ErrUnauthorized, h.logger)
		return
	}

	idea, err := h.ideaService.PublishIdea(r.Context(), userID, ideaID)
	if err != nil {
		respondError(w, err, h.logger)
		return
	}

	respond.JSON(w, http.StatusOK, idea)
}

// ListIdeas handles GET /ideas
func (h *IdeaHandler) ListIdeas(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	cursor := domain.Cursor(r.URL.Query().Get("cursor"))

	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		respondError(w, domain.ErrUnauthorized, h.logger)
		return
	}

	// Fetch one extra to detect if next page exists
	ideas, err := h.ideaService.ListIdeas(r.Context(), userID, limit+1, cursor)
	if err != nil {
		respondError(w, err, h.logger)
		return
	}

	// Detect next page
	hasNextPage := len(ideas) > limit
	if hasNextPage {
		ideas = ideas[:limit]
	}

	pageInfo := &domain.PageInfo{
		HasNextPage: hasNextPage,
		Count:       len(ideas),
	}

	if hasNextPage && len(ideas) > 0 {
		pageInfo.NextCursor = domain.EncodeCursor(ideas[len(ideas)-1].ID)
	}

	respond.Paginated(w, http.StatusOK, ideas, pageInfo)
}

// respondError is the canonical error translator.
func respondError(w http.ResponseWriter, err error, logger zerolog.Logger) {
	appErr, ok := err.(*domain.AppError)
	if !ok {
		logger.Error().Err(err).Msg("Non-AppError returned to HTTP handler")
		appErr = domain.ErrInternal
	}

	logger.Error().
		Str("code", appErr.Code).
		Int("status", appErr.HTTPStatus).
		Str("details", appErr.Details).
		Msg("Request error")

	respond.Error(w, appErr)
}

// formatErrors converts validator errors to a readable string.
func formatErrors(err error) string {
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		var msg string
		for _, fieldError := range validationErrors {
			msg += fieldError.Field() + " failed validation: " + fieldError.Tag() + "; "
		}
		return msg
	}
	return err.Error()
}
```

---

## 7. Dependency Injection

### Philosophy

Use manual constructor injection. No DI frameworks. Dependencies flow through constructors, making the dependency graph explicit and testable.

### main.go Wiring Example

```go
// cmd/api/main.go
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"ordo/internal/config"
	"ordo/internal/handler"
	"ordo/internal/middleware"
	"ordo/internal/repository"
	"ordo/internal/server"
	"ordo/internal/service"
)

func main() {
	// 1. Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
	}

	// 2. Initialize database pool
	dbPool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer dbPool.Close()

	// 3. Initialize validator
	v := validator.New()

	// 4. Wire repositories (repositories depend on DB pool)
	ideaRepo := repository.NewIdeaRepository(dbPool)
	contentRepo := repository.NewContentRepository(dbPool)
	userRepo := repository.NewUserRepository(dbPool)

	// 5. Wire external services (e.g., AI provider)
	aiProvider := &service.OpenAIProvider{
		APIKey: cfg.OpenAIKey,
	}

	// 6. Wire application services (services depend on repos and providers)
	ideaService := service.NewIdeaService(ideaRepo, aiProvider, log.Logger)
	contentService := service.NewContentService(contentRepo, ideaRepo, log.Logger)
	userService := service.NewUserService(userRepo, log.Logger)

	// 7. Wire HTTP handlers (handlers depend on services)
	ideaHandler := handler.NewIdeaHandler(ideaService, v, log.Logger)
	contentHandler := handler.NewContentHandler(contentService, v, log.Logger)
	userHandler := handler.NewUserHandler(userService, v, log.Logger)

	// 8. Set up HTTP server with middleware and routes
	router := server.SetupRoutes(
		ideaHandler,
		contentHandler,
		userHandler,
	)

	httpServer := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	// 9. Start server in goroutine
	go func() {
		log.Info().Str("port", cfg.Port).Msg("Server starting")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// 10. Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Info().Msg("Shutting down server")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server shutdown error")
	}

	log.Info().Msg("Server stopped")
}
```

### Server Setup

```go
// internal/server/routes.go
package server

import (
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"ordo/internal/handler"
	"ordo/internal/middleware"
)

// SetupRoutes configures all HTTP routes and middleware.
func SetupRoutes(
	ideaHandler *handler.IdeaHandler,
	contentHandler *handler.ContentHandler,
	userHandler *handler.UserHandler,
) http.Handler {
	router := chi.NewRouter()

	// Global middleware (order matters)
	router.Use(middleware.RequestID)
	router.Use(middleware.Logger)
	router.Use(middleware.Recovery)
	router.Use(middleware.Timeout(30 * time.Second))
	router.Use(middleware.Compress())

	// Public routes
	router.Post("/auth/signup", userHandler.Signup)
	router.Post("/auth/login", userHandler.Login)

	// Protected routes (require authentication)
	router.Group(func(r chi.Router) {
		r.Use(middleware.Auth)
		r.Use(middleware.WorkspaceContext)

		// Ideas
		r.Get("/ideas", ideaHandler.ListIdeas)
		r.Post("/ideas", ideaHandler.CreateIdea)
		r.Get("/ideas/{id}", ideaHandler.GetIdea)
		r.Patch("/ideas/{id}", ideaHandler.UpdateIdea)
		r.Post("/ideas/{id}/publish", ideaHandler.PublishIdea)

		// Content
		r.Get("/content", contentHandler.ListContent)
		r.Post("/content", contentHandler.CreateContent)
		r.Get("/content/{id}", contentHandler.GetContent)
	})

	return router
}
```

---

## 8. Naming Conventions

### Packages

- **Lowercase, single-word names**: `handler`, `service`, `domain`, `repository`, `middleware`, `config`, `server`
- **Avoid underscores and abbreviations**
- **Avoid generic names like `util`, `common`, `helper`** (prefer specific like `validator`, `formatter`)

### Files

- **snake_case**: `idea_handler.go`, `user_service.go`, `content_repository.go`
- **Test files**: `idea_handler_test.go` (matches implementation file)
- **One type per file for domain models**: `idea.go`, `user.go`, `content.go`
- **Group related handlers** in one file: `handler/idea.go` contains `IdeaHandler` + methods

### Exported Types & Functions

- **PascalCase**: `IdeaService`, `ContentRepository`, `CreateIdea`, `GetByID`
- **Interfaces end with -er when descriptive**: `Reader`, `Writer`, `Logger`, `Publisher`
- **Or describe behavior**: `IdeaRepository`, `AIProvider`

### Unexported Types & Functions

- **camelCase**: `ideaService`, `createIdea`, `parseRequest`

### Constructors

- **Pattern: `New{Type}`**: `NewIdeaService`, `NewIdeaRepository`, `NewIdeaHandler`

### Getters

- **No `Get` prefix**: Use `idea.Title()` not `idea.GetTitle()`
- **Exception: Boolean getters can use `Is` prefix**: `IsPublished()`, `HasPermission()`

### Constants & Enums

- **PascalCase**: `IdeaDraft`, `IdeaPublished`, `StatusActive`
- **Group related constants**:

```go
const (
	IdeaDraft     = "DRAFT"
	IdeaPublished = "PUBLISHED"
	IdeaArchived  = "ARCHIVED"
)
```

---

## 9. Context Usage

### Philosophy

Context carries deadlines, cancellation signals, and request-scoped values (user ID, workspace ID). Never store context in structs; always pass it as the first parameter.

### Function Signature Pattern

```go
// GOOD: context is first parameter
func (s *Service) CreateIdea(ctx context.Context, userID string, req *Request) (*Idea, error)

// BAD: context is not first, or missing
func (s *Service) CreateIdea(userID string, ctx context.Context, req *Request) (*Idea, error)
func (s *Service) CreateIdea(userID string, req *Request) (*Idea, error)
```

### Timeout Configuration

Set timeouts based on operation type:

```go
// HTTP request timeout (applies to all request handlers)
// Set in server setup: server.ReadTimeout = 30s, WriteTimeout = 30s

// Database query timeout
dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
err := db.QueryRowContext(dbCtx, sql, args...)

// External API timeout (default)
apiCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
defer cancel()
resp, err := client.Do(req.WithContext(apiCtx))

// AI provider timeout (longer due to LLM latency)
aiCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
result, err := ai.Generate(aiCtx, prompt)
```

### Injecting User & Workspace into Context

Use middleware to inject authenticated user:

```go
// internal/middleware/auth.go
package middleware

import (
	"context"
	"net/http"
	"strings"
	"github.com/rs/zerolog/log"
	"ordo/internal/domain"
)

// Auth validates JWT and injects user into context.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract JWT from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		// Validate JWT and extract claims
		userID, err := validateToken(token)
		if err != nil {
			log.Warn().Err(err).Msg("Invalid token")
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Inject user ID into context
		ctx := context.WithValue(r.Context(), "user_id", userID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func validateToken(token string) (string, error) {
	// JWT validation logic
	return "", nil
}
```

### Using Context Values in Services

```go
func (s *IdeaService) CreateIdea(ctx context.Context, userID string, req *Request) (*Idea, error) {
	// userID is passed explicitly (not extracted from context)
	// This makes dependency clear and testable

	// However, if needed, extract request ID for logging:
	requestID := ctx.Value("request_id")

	logger := log.With().
		Str("request_id", toString(requestID)).
		Str("user_id", userID).
		Logger()

	// ... rest of method
}
```

### NEVER Store Context in Structs

```go
// BAD: Never do this
type Service struct {
	ctx context.Context // WRONG
	repo Repository
}

// GOOD: Accept context as parameter
func (s *Service) DoSomething(ctx context.Context) error {
	// Use ctx for this operation only
}
```

---

## 10. Concurrency Patterns

### Fan-Out Pattern with goroutines

For independent work that can happen concurrently:

```go
// Fetch user data from multiple services in parallel
func (s *UserService) GetUserWithDetails(ctx context.Context, userID string) (*UserWithDetails, error) {
	user := make(chan *User, 1)
	preferences := make(chan *UserPreferences, 1)
	subscriptions := make(chan []*Subscription, 1)
	errCh := make(chan error, 3)

	// Fan out: start independent goroutines
	go func() {
		u, err := s.repo.GetUser(ctx, userID)
		if err != nil {
			errCh <- err
		} else {
			user <- u
		}
	}()

	go func() {
		p, err := s.prefService.GetPreferences(ctx, userID)
		if err != nil {
			errCh <- err
		} else {
			preferences <- p
		}
	}()

	go func() {
		subs, err := s.subService.GetSubscriptions(ctx, userID)
		if err != nil {
			errCh <- err
		} else {
			subscriptions <- subs
		}
	}()

	// Collect results with timeout
	timeout := time.NewTimer(10 * time.Second)
	defer timeout.Stop()

	var u *User
	var prefs *UserPreferences
	var subs []*Subscription
	completed := 0

	for {
		select {
		case u = <-user:
			completed++
		case prefs = <-preferences:
			completed++
		case subs = <-subscriptions:
			completed++
		case err := <-errCh:
			return nil, err
		case <-timeout.C:
			return nil, errors.New("timeout fetching user details")
		case <-ctx.Done():
			return nil, ctx.Err()
		}

		if completed == 3 {
			break
		}
	}

	return &UserWithDetails{
		User:          u,
		Preferences:   prefs,
		Subscriptions: subs,
	}, nil
}
```

### errgroup for Parallel Operations with Error Handling

Use `golang.org/x/sync/errgroup` for cleaner parallel work:

```bash
go get golang.org/x/sync
```

```go
import "golang.org/x/sync/errgroup"

// Publish idea to multiple platforms in parallel
func (s *PublishService) PublishToAll(ctx context.Context, ideaID string, platforms []string) error {
	g, ctx := errgroup.WithContext(ctx)

	for _, platform := range platforms {
		platform := platform // Capture for closure
		g.Go(func() error {
			return s.publishToPlatform(ctx, ideaID, platform)
		})
	}

	// Wait for all goroutines; return first error if any
	return g.Wait()
}

func (s *PublishService) publishToPlatform(ctx context.Context, ideaID, platform string) error {
	// ... implementation
	return nil
}
```

### Channels for Pub/Sub (WebSocket Hub)

```go
// internal/ws/hub.go
package ws

import (
	"context"
	"sync"
)

// Hub manages WebSocket connections and broadcasts messages.
type Hub struct {
	clients    map[string]*Client        // client_id -> client
	broadcast  chan *Message             // Messages to broadcast
	register   chan *Client              // New client connections
	unregister chan *Client              // Client disconnections
	mu         sync.RWMutex              // Protects clients map
}

// Client represents a WebSocket connection.
type Client struct {
	ID       string
	conn     *websocket.Conn
	send     chan *Message
}

// Message is sent over the hub.
type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// NewHub creates a new broadcast hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan *Message, 16),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's event loop.
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			log.Info().Str("client_id", client.ID).Msg("Client connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				delete(h.clients, client.ID)
				close(client.send)
			}
			h.mu.Unlock()
			log.Info().Str("client_id", client.ID).Msg("Client disconnected")

		case message := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client's send channel is full; skip this message
					log.Warn().Str("client_id", client.ID).Msg("Client send buffer full")
				}
			}
			h.mu.RUnlock()

		case <-ctx.Done():
			return
		}
	}
}

// Broadcast sends a message to all connected clients.
func (h *Hub) Broadcast(message *Message) {
	h.broadcast <- message
}
```

### sync.Pool for Buffer Reuse

Reuse buffers to reduce GC pressure during high-throughput operations:

```go
import "sync"

// bufferPool reuses JSON encoding buffers.
var bufferPool = sync.Pool{
	New: func() interface{} {
		return new(bytes.Buffer)
	},
}

// encodeEvent reuses a buffer to encode an event as JSON.
func encodeEvent(event *Event) ([]byte, error) {
	buf := bufferPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset()
		bufferPool.Put(buf)
	}()

	if err := json.NewEncoder(buf).Encode(event); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
```

### Context Cancellation in Goroutines

Always respect context cancellation:

```go
// Process items asynchronously with cancellation support
func (s *Service) ProcessItemsAsync(ctx context.Context, items []string) error {
	g, ctx := errgroup.WithContext(ctx)

	for _, item := range items {
		item := item
		g.Go(func() error {
			select {
			case <-ctx.Done():
				return ctx.Err() // Respect cancellation
			default:
			}

			return s.processItem(ctx, item)
		})
	}

	return g.Wait()
}

// Clean shutdown of long-running goroutine
func (s *Service) StartWorker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.doWork(ctx)

		case <-ctx.Done():
			log.Info().Msg("Worker shutting down")
			return
		}
	}
}
```

---

## 11. Code Organization Rules

### Max Function Length: ~50 Lines

Refactor functions that exceed ~50 lines. Each function should have a single, clear responsibility:

```go
// GOOD: Function is focused
func (s *Service) CreateIdea(ctx context.Context, userID string, req *Request) (*Idea, error) {
	if err := validateInput(req); err != nil {
		return nil, err
	}

	idea := &Idea{
		Title:   req.Title,
		UserID:  userID,
		Status:  IdeaDraft,
	}

	if err := s.repo.Create(ctx, idea); err != nil {
		return nil, err
	}

	return idea, nil
}

// BAD: Function does too much
func (s *Service) CreateAndPublishIdea(ctx context.Context, userID string, req *Request) (*Idea, error) {
	// ... 100+ lines: validation, creation, publishing, webhook calls, etc.
}
```

### Max File Length: ~500 Lines

Split files that exceed ~500 lines. For example:

```
handler/
  ├── idea.go          (IdeaHandler + methods)
  ├── content.go       (ContentHandler + methods)
  ├── user.go          (UserHandler + methods)

service/
  ├── idea_service.go
  ├── content_service.go
  ├── user_service.go
```

### One Type Per File for Domain Models

```
domain/
  ├── idea.go          (Idea type, constants, methods)
  ├── content.go       (Content type, constants, methods)
  ├── user.go          (User type, constants, methods)
  ├── errors.go        (All error types)
  ├── pagination.go    (Pagination types)
```

### Group Related Handlers in One File

```go
// internal/handler/idea.go
type IdeaHandler struct { ... }

func (h *IdeaHandler) ListIdeas(w http.ResponseWriter, r *http.Request) { ... }
func (h *IdeaHandler) CreateIdea(w http.ResponseWriter, r *http.Request) { ... }
func (h *IdeaHandler) GetIdea(w http.ResponseWriter, r *http.Request) { ... }
func (h *IdeaHandler) UpdateIdea(w http.ResponseWriter, r *http.Request) { ... }
```

### Import Order

Organize imports in three groups (with blank lines between):

1. Standard library
2. Third-party packages
3. Internal packages

```go
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog"
	"golang.org/x/sync/errgroup"

	"ordo/internal/domain"
	"ordo/internal/repository"
	"ordo/pkg/respond"
)
```

---

## 12. golangci-lint Configuration

### Setup

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### Configuration File: `.golangci.yml`

```yaml
run:
  timeout: 5m
  build-tags:
    - integration
  skip-dirs:
    - vendor
    - .git

linters:
  enable:
    # Error checking
    - errcheck        # Check for unchecked errors
    - gosimple        # Suggest code simplifications
    - govet           # Vet examines Go source code and reports suspicious constructs
    - ineffassign     # Detect ineffectual assignments
    - staticcheck     # Go vet on steroids
    - unused          # Check for unused variables, constants, functions
    
    # Formatting
    - gofmt           # Check if code is gofmtted
    - goimports       # Check import ordering
    
    # Best practices
    - revive          # Configurable linter enforcing coding standards
    - gosec           # Security scanner
    - dupl            # Tool for code clone detection
    - nestif          # Check for deeply nested if statements

linters-settings:
  revive:
    enable-all-rules: false
    rules:
      - name: blank-imports
        severity: error
      - name: context-as-argument
        severity: error
      - name: context-keys-type
        severity: error
      - name: error-strings
        severity: error
      - name: error-naming
        severity: error
      - name: exported
        severity: warning
        arguments:
          - "checkPrivateReceivers"
      - name: if-return
        severity: warning
      - name: package-comments
        severity: warning
      - name: receiver-naming
        severity: warning
      - name: var-naming
        severity: warning
      - name: unexported-return
        severity: error

  gosec:
    severity: error
    confidence: medium

  nestif:
    min-complexity: 4

issues:
  exclude-rules:
    # Ignore errors in test files
    - path: _test\.go
      linters:
        - errcheck
        - gosec
```

### Usage

```bash
# Run linters
golangci-lint run ./...

# Run linters with fix (some linters can auto-fix)
golangci-lint run --fix ./...

# Run specific linter
golangci-lint run --enable errcheck ./...
```

### CI Integration (GitHub Actions)

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: "1.21"
      - uses: golangci/golangci-lint-action@v3
        with:
          version: latest
```

---

## Summary

This conventions document is the team's coding bible. Enforce these standards through:

1. **Code review**: Check PRs against these conventions
2. **CI/CD**: Run golangci-lint on all PRs
3. **IDE setup**: Configure Go formatters and linters in your editor
4. **Team discussion**: Update conventions as team learns and evolves

**Questions?** Discuss in team channels or create a proposal to update this document.

Last Updated: 2026-03-10
