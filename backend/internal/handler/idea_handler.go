package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// IdeaHandler handles all idea HTTP endpoints.
type IdeaHandler struct {
	ideaSvc service.IdeaService
}

// NewIdeaHandler creates a new IdeaHandler.
func NewIdeaHandler(ideaSvc service.IdeaService) *IdeaHandler {
	return &IdeaHandler{ideaSvc: ideaSvc}
}

// ---- Request types ----

type createIdeaRequest struct {
	Title          string               `json:"title"`
	Description    *string              `json:"description"`
	PlatformTarget *domain.PlatformType `json:"platform_target"`
}

type updateIdeaRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
}

type setIdeaTagsRequest struct {
	Tags []string `json:"tags"`
}

// ---- Handlers ----

// Create POST /api/v1/workspaces/{workspaceId}/ideas
func (h *IdeaHandler) Create(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createIdeaRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Title == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "title is required", 400))
		return
	}

	idea, err := h.ideaSvc.Create(r.Context(), member.WorkspaceID, member.UserID, req.Title, req.Description, req.PlatformTarget)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, idea)
}

// List GET /api/v1/workspaces/{workspaceId}/ideas
func (h *IdeaHandler) List(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	filter := domain.IdeaFilter{
		Limit:  50,
		Offset: 0,
	}

	ideas, err := h.ideaSvc.List(r.Context(), member.WorkspaceID, filter)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, ideas)
}

// Get GET /api/v1/workspaces/{workspaceId}/ideas/{ideaId}
func (h *IdeaHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	ideaIDStr := chi.URLParam(r, "ideaId")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid ideaId", 400))
		return
	}

	idea, err := h.ideaSvc.GetByID(r.Context(), ideaID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, idea)
}

// Update PUT /api/v1/workspaces/{workspaceId}/ideas/{ideaId}
func (h *IdeaHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	ideaIDStr := chi.URLParam(r, "ideaId")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid ideaId", 400))
		return
	}

	var req updateIdeaRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	idea, err := h.ideaSvc.Update(r.Context(), ideaID, req.Title, req.Description)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, idea)
}

// Delete DELETE /api/v1/workspaces/{workspaceId}/ideas/{ideaId}
func (h *IdeaHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	ideaIDStr := chi.URLParam(r, "ideaId")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid ideaId", 400))
		return
	}

	if err := h.ideaSvc.Delete(r.Context(), ideaID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// RequestValidation POST /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/validate
func (h *IdeaHandler) RequestValidation(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	ideaIDStr := chi.URLParam(r, "ideaId")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid ideaId", 400))
		return
	}

	if err := h.ideaSvc.RequestValidation(r.Context(), ideaID); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusAccepted, map[string]string{"message": "validation requested"})
}

// SetTags PUT /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/tags
func (h *IdeaHandler) SetTags(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	ideaIDStr := chi.URLParam(r, "ideaId")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid ideaId", 400))
		return
	}

	var req setIdeaTagsRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	idea, err := h.ideaSvc.SetTags(r.Context(), ideaID, req.Tags)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, idea)
}

// Promote POST /api/v1/workspaces/{workspaceId}/ideas/{ideaId}/promote
func (h *IdeaHandler) Promote(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	ideaIDStr := chi.URLParam(r, "ideaId")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid ideaId", 400))
		return
	}

	content, err := h.ideaSvc.Promote(r.Context(), ideaID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, content)
}
