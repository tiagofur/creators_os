package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// PublishingHandler handles all publishing HTTP endpoints.
type PublishingHandler struct {
	svc service.PublishingService
}

// NewPublishingHandler creates a new PublishingHandler.
func NewPublishingHandler(svc service.PublishingService) *PublishingHandler {
	return &PublishingHandler{svc: svc}
}

// ---- Request types ----

type storeCredentialRequest struct {
	Platform     domain.PlatformType `json:"platform"`
	AccessToken  *string             `json:"access_token"`
	RefreshToken *string             `json:"refresh_token"`
	Scopes       []string            `json:"scopes"`
	ExpiresAt    *time.Time          `json:"expires_at"`
}

type schedulePostRequest struct {
	ContentID   string              `json:"content_id"`
	Platform    domain.PlatformType `json:"platform"`
	ScheduledAt time.Time           `json:"scheduled_at"`
}

type getOAuthURLRequest struct {
	Platform domain.PlatformType `json:"platform"`
	State    string              `json:"state"`
}

// POST /api/v1/workspaces/{workspaceId}/publishing/credentials
func (h *PublishingHandler) StoreCredential(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	// Check if this is an OAuth URL request.
	var req storeCredentialRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.Platform == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "platform is required", 400))
		return
	}

	// If no access token provided, return an OAuth URL.
	if req.AccessToken == nil {
		url := h.svc.GetOAuthURL(req.Platform, member.WorkspaceID.String())
		JSON(w, http.StatusOK, map[string]string{"oauth_url": url})
		return
	}

	cred, err := h.svc.StoreCredential(r.Context(), member.WorkspaceID, req.Platform, req.AccessToken, req.RefreshToken, req.Scopes, req.ExpiresAt)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, cred)
}

// GET /api/v1/workspaces/{workspaceId}/publishing/credentials
func (h *PublishingHandler) ListCredentials(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	creds, err := h.svc.ListCredentials(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, creds)
}

// DELETE /api/v1/workspaces/{workspaceId}/publishing/credentials/{id}
func (h *PublishingHandler) DeleteCredential(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	credID, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid credential id", 400))
		return
	}

	if err := h.svc.DeleteCredential(r.Context(), credID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/workspaces/{workspaceId}/publishing/schedule
func (h *PublishingHandler) SchedulePost(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req schedulePostRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	contentID, err := uuid.Parse(req.ContentID)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid content_id", 400))
		return
	}
	if req.Platform == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "platform is required", 400))
		return
	}
	if req.ScheduledAt.IsZero() {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "scheduled_at is required", 400))
		return
	}

	post, err := h.svc.SchedulePost(r.Context(), member.WorkspaceID, contentID, req.Platform, req.ScheduledAt)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, post)
}

// GET /api/v1/workspaces/{workspaceId}/publishing/calendar
func (h *PublishingHandler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var from, to time.Time
	var parseErr error

	if fromStr != "" {
		from, parseErr = time.Parse(time.RFC3339, fromStr)
		if parseErr != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid from date format, use ISO 8601", 400))
			return
		}
	} else {
		from = time.Now().UTC()
	}

	if toStr != "" {
		to, parseErr = time.Parse(time.RFC3339, toStr)
		if parseErr != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid to date format, use ISO 8601", 400))
			return
		}
	} else {
		to = from.AddDate(0, 1, 0) // default: 1 month
	}

	posts, err := h.svc.GetCalendar(r.Context(), member.WorkspaceID, from, to)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, posts)
}

// DELETE /api/v1/workspaces/{workspaceId}/publishing/schedule/{id}
func (h *PublishingHandler) CancelScheduledPost(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid post id", 400))
		return
	}

	if err := h.svc.CancelScheduledPost(r.Context(), postID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
