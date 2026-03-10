package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/domain"
)

// contextKey is an unexported type for context keys in this package.
type contextKey int

const contextKeyUserClaims contextKey = iota

// Authenticate returns a middleware that validates the Bearer JWT in the
// Authorization header and injects the resulting *domain.UserClaims into ctx.
//
// On missing or invalid token it responds 401; on expired token it responds 401
// with code AUTH_003.
func Authenticate(jwtManager *auth.JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				writeAuthError(w, domain.ErrUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := jwtManager.ValidateToken(tokenString)
			if err != nil {
				writeAuthError(w, err)
				return
			}

			ctx := context.WithValue(r.Context(), contextKeyUserClaims, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserClaimsFromContext retrieves the *domain.UserClaims from context.
// Returns (nil, false) if not present.
func UserClaimsFromContext(ctx context.Context) (*domain.UserClaims, bool) {
	claims, ok := ctx.Value(contextKeyUserClaims).(*domain.UserClaims)
	return claims, ok
}

// WithUserClaims injects UserClaims into the context.
// Used in tests to bypass the full JWT validation middleware.
func WithUserClaims(ctx context.Context, claims *domain.UserClaims) context.Context {
	return context.WithValue(ctx, contextKeyUserClaims, claims)
}

// writeAuthError writes a JSON 401 response for authentication errors.
func writeAuthError(w http.ResponseWriter, err error) {
	var appErr *domain.AppError
	if errors.As(err, &appErr) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(appErr.HTTPStatus)
		// Avoid importing handler package (circular dep) — write JSON manually
		_, _ = w.Write([]byte(`{"code":"` + appErr.Code + `","message":"` + appErr.Message + `"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"code":"AUTH_002","message":"unauthorized"}`))
}
