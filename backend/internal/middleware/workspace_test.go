package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/repository"
)

// mockWorkspaceRepo is a minimal in-memory mock for WorkspaceRepository.
type mockWorkspaceRepo struct {
	member *domain.WorkspaceMember
	err    error
}

func (m *mockWorkspaceRepo) Create(_ context.Context, _ *domain.Workspace) (*domain.Workspace, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) GetByID(_ context.Context, _ uuid.UUID) (*domain.Workspace, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) GetBySlug(_ context.Context, _ string) (*domain.Workspace, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) ListByUserID(_ context.Context, _ uuid.UUID) ([]*domain.Workspace, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) Update(_ context.Context, _ *domain.Workspace) (*domain.Workspace, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockWorkspaceRepo) GetMember(_ context.Context, _, _ uuid.UUID) (*domain.WorkspaceMember, error) {
	return m.member, m.err
}
func (m *mockWorkspaceRepo) ListMembers(_ context.Context, _ uuid.UUID) ([]*domain.WorkspaceMember, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) AddMember(_ context.Context, _, _ uuid.UUID, _ domain.WorkspaceRole) (*domain.WorkspaceMember, error) {
	return nil, nil
}
func (m *mockWorkspaceRepo) UpdateMemberRole(_ context.Context, _, _ uuid.UUID, _ domain.WorkspaceRole) error {
	return nil
}
func (m *mockWorkspaceRepo) RemoveMember(_ context.Context, _, _ uuid.UUID) error { return nil }
func (m *mockWorkspaceRepo) CountMembers(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}
func (m *mockWorkspaceRepo) CountByOwner(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}

var _ repository.WorkspaceRepository = (*mockWorkspaceRepo)(nil)

// withUserClaims injects UserClaims into the context using the WithUserClaims helper.
func injectClaims(userID uuid.UUID, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := &domain.UserClaims{UserID: userID, Email: "test@example.com"}
		ctx := middleware.WithUserClaims(r.Context(), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func buildRouter(workspaceID uuid.UUID, userID uuid.UUID, repo repository.WorkspaceRepository, handler http.HandlerFunc, roles ...domain.WorkspaceRole) http.Handler {
	r := chi.NewRouter()
	r.Route("/workspaces/{workspaceId}", func(r chi.Router) {
		r.Use(func(next http.Handler) http.Handler {
			return injectClaims(userID, next)
		})
		r.Use(middleware.RequireWorkspaceMember(repo))
		if len(roles) > 0 {
			r.Use(middleware.RequireRole(roles...))
		}
		r.Get("/", handler)
	})
	return r
}

// TestRequireWorkspaceMember_NonMemberGets403 verifies that a user who is not a workspace
// member receives a 403 response.
func TestRequireWorkspaceMember_NonMemberGets403(t *testing.T) {
	workspaceID := uuid.New()
	userID := uuid.New()
	repo := &mockWorkspaceRepo{member: nil, err: domain.ErrNotFound}

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	r := buildRouter(workspaceID, userID, repo, handler)
	req := httptest.NewRequest("GET", "/workspaces/"+workspaceID.String()+"/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if called {
		t.Error("handler should not have been called for non-member")
	}
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// TestRequireRole_ViewerBlockedFromAdminRoute verifies that a viewer cannot access
// an admin-only route.
func TestRequireRole_ViewerBlockedFromAdminRoute(t *testing.T) {
	workspaceID := uuid.New()
	userID := uuid.New()
	viewerMember := &domain.WorkspaceMember{
		ID:          uuid.New(),
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        domain.RoleViewer,
	}
	repo := &mockWorkspaceRepo{member: viewerMember, err: nil}

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	r := buildRouter(workspaceID, userID, repo, handler, domain.RoleAdmin)
	req := httptest.NewRequest("GET", "/workspaces/"+workspaceID.String()+"/", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if called {
		t.Error("handler should not have been called for viewer on admin-only route")
	}
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// TestRequireRole_AdminPassesEditorRoute verifies that an admin can access an editor route.
func TestRequireRole_AdminPassesEditorRoute(t *testing.T) {
	adminMember := &domain.WorkspaceMember{
		ID:   uuid.New(),
		Role: domain.RoleAdmin,
	}

	req := httptest.NewRequest("GET", "/", nil)
	ctx := middleware.WithWorkspaceMember(req.Context(), adminMember)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	called := false
	handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	middleware.RequireRole(domain.RoleEditor)(handler).ServeHTTP(w, req)

	if !called {
		t.Error("admin should be able to access editor route")
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// TestRequireRole_OwnerPassesAllRoutes verifies that an owner can access routes
// requiring any role level.
func TestRequireRole_OwnerPassesAllRoutes(t *testing.T) {
	ownerMember := &domain.WorkspaceMember{
		ID:   uuid.New(),
		Role: domain.RoleOwner,
	}

	for _, role := range []domain.WorkspaceRole{domain.RoleViewer, domain.RoleEditor, domain.RoleAdmin, domain.RoleOwner} {
		req := httptest.NewRequest("GET", "/", nil)
		ctx := middleware.WithWorkspaceMember(req.Context(), ownerMember)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		called := false
		handler := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		})

		middleware.RequireRole(role)(handler).ServeHTTP(w, req)

		if !called {
			t.Errorf("owner should pass route requiring %s", role)
		}
		if w.Code != http.StatusOK {
			t.Errorf("expected 200 for role %s, got %d", role, w.Code)
		}
	}
}
