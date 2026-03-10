package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

// contextKeyWorkspaceMember is the context key for the authenticated workspace member.
const contextKeyWorkspaceMember contextKey = 10

// RequireWorkspaceMember is a Chi middleware that reads the workspaceId URL param,
// verifies the authenticated user is a member of that workspace, and injects
// the *domain.WorkspaceMember into the request context.
//
// Returns 401 if no user claims in context, 400 on invalid UUID, 403 if not a member.
// Must be used after middleware.Authenticate.
func RequireWorkspaceMember(repo repository.WorkspaceRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := UserClaimsFromContext(r.Context())
			if !ok {
				writeWorkspaceError(w, domain.ErrUnauthorized)
				return
			}

			workspaceIDStr := chi.URLParam(r, "workspaceId")
			workspaceID, err := uuid.Parse(workspaceIDStr)
			if err != nil {
				writeWorkspaceError(w, domain.NewError("VALIDATION", "invalid workspaceId", 400))
				return
			}

			member, err := repo.GetMember(r.Context(), workspaceID, claims.UserID)
			if err != nil {
				// Any error (not found, DB error) → 403 to avoid leaking workspace existence
				writeWorkspaceError(w, domain.NewError("NOT_WORKSPACE_MEMBER", "not a member of this workspace", 403))
				return
			}

			ctx := context.WithValue(r.Context(), contextKeyWorkspaceMember, member)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole returns a middleware that enforces a minimum role rank.
// The authenticated member must have a role rank >= the minimum of the allowed roles.
// The workspace ID for any DB queries should always come from the member in context,
// not the raw URL param, to prevent IDOR attacks.
func RequireRole(roles ...domain.WorkspaceRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			member, ok := WorkspaceMemberFromContext(r.Context())
			if !ok {
				writeWorkspaceError(w, domain.ErrUnauthorized)
				return
			}

			memberRank := domain.RoleRank(member.Role)
			allowed := false
			for _, role := range roles {
				if memberRank >= domain.RoleRank(role) {
					allowed = true
					break
				}
			}

			if !allowed {
				writeWorkspaceError(w, domain.NewError("INSUFFICIENT_ROLE", "insufficient role for this action", 403))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// WorkspaceMemberFromContext retrieves the *domain.WorkspaceMember from context.
// Returns (nil, false) if not present.
func WorkspaceMemberFromContext(ctx context.Context) (*domain.WorkspaceMember, bool) {
	member, ok := ctx.Value(contextKeyWorkspaceMember).(*domain.WorkspaceMember)
	return member, ok
}

// WithWorkspaceMember injects a WorkspaceMember into the context.
// Used in tests to bypass the full middleware stack.
func WithWorkspaceMember(ctx context.Context, member *domain.WorkspaceMember) context.Context {
	return context.WithValue(ctx, contextKeyWorkspaceMember, member)
}

// writeWorkspaceError writes a JSON error response for workspace middleware errors.
func writeWorkspaceError(w http.ResponseWriter, err error) {
	appErr, ok := err.(*domain.AppError)
	if !ok {
		appErr = domain.NewError("INTERNAL", "internal server error", 500)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.HTTPStatus)
	body, _ := json.Marshal(appErr)
	_, _ = w.Write(body)
}
