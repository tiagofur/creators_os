package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// WorkspaceHandler handles all workspace HTTP endpoints.
type WorkspaceHandler struct {
	wsService service.WorkspaceService
}

// NewWorkspaceHandler creates a new WorkspaceHandler.
func NewWorkspaceHandler(wsService service.WorkspaceService) *WorkspaceHandler {
	return &WorkspaceHandler{wsService: wsService}
}

// ---- Request / Response types ----

type createWorkspaceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type updateWorkspaceRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type updateMemberRoleRequest struct {
	Role domain.WorkspaceRole `json:"role"`
}

type inviteMemberRequest struct {
	Email string               `json:"email"`
	Role  domain.WorkspaceRole `json:"role"`
}

// ---- Workspace CRUD Handlers ----

// Create POST /api/v1/workspaces
func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createWorkspaceRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Name == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "name is required", 400))
		return
	}

	ws, err := h.wsService.CreateWorkspace(r.Context(), claims.UserID, req.Name, req.Description)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, ws)
}

// List GET /api/v1/workspaces
func (h *WorkspaceHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	workspaces, err := h.wsService.ListWorkspaces(r.Context(), claims.UserID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, workspaces)
}

// Get GET /api/v1/workspaces/{workspaceId}
func (h *WorkspaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	// Use workspace ID from the authenticated membership record (not raw URL param)
	ws, err := h.wsService.GetWorkspace(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, ws)
}

// Update PUT /api/v1/workspaces/{workspaceId}
func (h *WorkspaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req updateWorkspaceRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	ws, err := h.wsService.UpdateWorkspace(r.Context(), member.WorkspaceID, req.Name, req.Description)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, ws)
}

// Delete DELETE /api/v1/workspaces/{workspaceId}
func (h *WorkspaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	if err := h.wsService.DeleteWorkspace(r.Context(), member.WorkspaceID, claims.UserID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- Member Handlers ----

// ListMembers GET /api/v1/workspaces/{workspaceId}/members
func (h *WorkspaceHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	members, err := h.wsService.ListMembers(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, members)
}

// UpdateMemberRole PUT /api/v1/workspaces/{workspaceId}/members/{userId}/role
func (h *WorkspaceHandler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid userId", 400))
		return
	}

	var req updateMemberRoleRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Role == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "role is required", 400))
		return
	}

	if err := h.wsService.UpdateMemberRole(r.Context(), member.WorkspaceID, targetUserID, req.Role); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"message": "role updated"})
}

// RemoveMember DELETE /api/v1/workspaces/{workspaceId}/members/{userId}
func (h *WorkspaceHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid userId", 400))
		return
	}

	if err := h.wsService.RemoveMember(r.Context(), member.WorkspaceID, targetUserID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- Invitation Handlers ----

// InviteMember POST /api/v1/workspaces/{workspaceId}/invitations
func (h *WorkspaceHandler) InviteMember(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req inviteMemberRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Email == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "email is required", 400))
		return
	}
	if req.Role == "" {
		req.Role = domain.RoleViewer
	}

	inv, err := h.wsService.InviteMember(r.Context(), member.WorkspaceID, claims.UserID, req.Email, req.Role)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, inv)
}

// ListInvitations GET /api/v1/workspaces/{workspaceId}/invitations
func (h *WorkspaceHandler) ListInvitations(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	invitations, err := h.wsService.ListInvitations(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, invitations)
}

// DeleteInvitation DELETE /api/v1/workspaces/{workspaceId}/invitations/{id}
func (h *WorkspaceHandler) DeleteInvitation(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	invID, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid invitation id", 400))
		return
	}

	if err := h.wsService.DeleteInvitation(r.Context(), invID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- Brand Kit Handlers ----

// GetBrandKit GET /api/v1/workspaces/{workspaceId}/brand-kit
func (h *WorkspaceHandler) GetBrandKit(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	kit, err := h.wsService.GetBrandKit(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, kit)
}

// UpdateBrandKit PUT /api/v1/workspaces/{workspaceId}/brand-kit
func (h *WorkspaceHandler) UpdateBrandKit(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var kit domain.BrandKit
	if err := Decode(r, &kit); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if err := h.wsService.UpdateBrandKit(r.Context(), member.WorkspaceID, &kit); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, kit)
}

// AcceptInvitation POST /api/v1/invitations/{token}/accept
func (h *WorkspaceHandler) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	token := chi.URLParam(r, "token")
	if token == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "token is required", 400))
		return
	}

	if err := h.wsService.AcceptInvitation(r.Context(), token, claims.UserID); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"message": "invitation accepted"})
}
