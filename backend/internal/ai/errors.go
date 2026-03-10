package ai

import "errors"

// ErrRateLimited is returned when the AI provider returns a 429 response.
var ErrRateLimited = errors.New("ai: rate limited")

// ErrProviderUnavailable is returned when the AI provider cannot be reached.
var ErrProviderUnavailable = errors.New("ai: provider unavailable")
