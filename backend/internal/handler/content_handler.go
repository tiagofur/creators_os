package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// ContentHandler handles all content HTTP endpoints.
type ContentHandler struct {
	contentSvc service.ContentService
}

// NewContentHandler creates a new ContentHandler.
func NewContentHandler(contentSvc service.ContentService) *ContentHandler {
	return &ContentHandler{contentSvc: contentSvc}
}

// ---- Request types ----

type createContentRequest struct {
	Title          string               `json:"title"`
	Description    *string              `json:"description"`
	ContentType    domain.ContentType   `json:"content_type"`
	PlatformTarget *domain.PlatformType `json:"platform_target"`
}

type updateContentRequest struct {
	Title          *string              `json:"title"`
	Description    *string              `json:"description"`
	PlatformTarget *domain.PlatformType `json:"platform_target"`
	DueDate        *string              `json:"due_date"`
	ScheduledAt    *string              `json:"scheduled_at"`
	Metadata       map[string]any       `json:"metadata"`
}

type transitionStatusRequest struct {
	Status domain.ContentStatus `json:"status"`
}

type addAssignmentRequest struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

// ---- Handlers ----

// Create POST /api/v1/workspaces/{workspaceId}/contents
func (h *ContentHandler) Create(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createContentRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Title == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "title is required", 400))
		return
	}

	content, err := h.contentSvc.Create(r.Context(), member.WorkspaceID, member.UserID, req.Title, req.Description, req.ContentType, req.PlatformTarget)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, content)
}

// List GET /api/v1/workspaces/{workspaceId}/contents
func (h *ContentHandler) List(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	filter := domain.ContentFilter{
		GroupBy: r.URL.Query().Get("group_by"),
		Limit:   50,
		Offset:  0,
	}

	contents, err := h.contentSvc.List(r.Context(), member.WorkspaceID, filter)
	if err != nil {
		Error(w, err)
		return
	}

	// Kanban grouping
	if filter.GroupBy == "status" {
		board := &domain.KanbanBoard{
			Columns: make(map[string][]*domain.Content),
		}
		for _, c := range contents {
			key := string(c.Status)
			board.Columns[key] = append(board.Columns[key], c)
		}
		JSON(w, http.StatusOK, board)
		return
	}

	JSON(w, http.StatusOK, contents)
}

// Get GET /api/v1/workspaces/{workspaceId}/contents/{contentId}
func (h *ContentHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	contentIDStr := chi.URLParam(r, "contentId")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid contentId", 400))
		return
	}

	content, err := h.contentSvc.GetByID(r.Context(), contentID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, content)
}

// Update PUT /api/v1/workspaces/{workspaceId}/contents/{contentId}
func (h *ContentHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	contentIDStr := chi.URLParam(r, "contentId")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid contentId", 400))
		return
	}

	var req updateContentRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	content, err := h.contentSvc.Update(r.Context(), contentID, req.Title, req.Description, req.PlatformTarget, req.DueDate, req.ScheduledAt, req.Metadata)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, content)
}

// Delete DELETE /api/v1/workspaces/{workspaceId}/contents/{contentId}
func (h *ContentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	contentIDStr := chi.URLParam(r, "contentId")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid contentId", 400))
		return
	}

	if err := h.contentSvc.Delete(r.Context(), contentID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// TransitionStatus PUT /api/v1/workspaces/{workspaceId}/contents/{contentId}/status
func (h *ContentHandler) TransitionStatus(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	contentIDStr := chi.URLParam(r, "contentId")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid contentId", 400))
		return
	}

	var req transitionStatusRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Status == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "status is required", 400))
		return
	}

	if err := h.contentSvc.TransitionStatus(r.Context(), contentID, req.Status); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"message": "status updated"})
}

// AddAssignment POST /api/v1/workspaces/{workspaceId}/contents/{contentId}/assignments
func (h *ContentHandler) AddAssignment(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	contentIDStr := chi.URLParam(r, "contentId")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid contentId", 400))
		return
	}

	var req addAssignmentRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.UserID == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "user_id is required", 400))
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid user_id", 400))
		return
	}

	assignment, err := h.contentSvc.AddAssignment(r.Context(), contentID, userID, req.Role)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, assignment)
}

// RemoveAssignment DELETE /api/v1/workspaces/{workspaceId}/contents/{contentId}/assignments/{userId}
func (h *ContentHandler) RemoveAssignment(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	contentIDStr := chi.URLParam(r, "contentId")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid contentId", 400))
		return
	}

	userIDStr := chi.URLParam(r, "userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid userId", 400))
		return
	}

	if err := h.contentSvc.RemoveAssignment(r.Context(), contentID, userID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
