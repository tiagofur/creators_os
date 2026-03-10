package domain

import "fmt"

// AppError is the canonical error type used throughout the application.
// HTTP handlers convert AppError to the appropriate HTTP response.
type AppError struct {
	Code       string         `json:"code"`
	Message    string         `json:"message"`
	HTTPStatus int            `json:"-"`
	Details    map[string]any `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// NewError creates a new AppError with the given code, message, and HTTP status.
func NewError(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, HTTPStatus: status}
}

// Sentinel errors used across services and repositories.
var (
	ErrNotFound     = NewError("NOT_FOUND", "resource not found", 404)
	ErrUnauthorized = NewError("AUTH_002", "unauthorized", 401)
	ErrTokenExpired = NewError("AUTH_003", "token expired", 401)
	ErrForbidden    = NewError("FORBIDDEN", "forbidden", 403)
)
