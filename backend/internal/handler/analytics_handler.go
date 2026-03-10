package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// AnalyticsHandler handles all analytics HTTP endpoints.
type AnalyticsHandler struct {
	svc service.AnalyticsService
}

// NewAnalyticsHandler creates a new AnalyticsHandler.
func NewAnalyticsHandler(svc service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{svc: svc}
}

// GET /api/v1/workspaces/{workspaceId}/analytics/overview
func (h *AnalyticsHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	overview, err := h.svc.GetOverview(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, overview)
}

// GET /api/v1/workspaces/{workspaceId}/analytics/content/{contentId}
func (h *AnalyticsHandler) GetContentAnalytics(w http.ResponseWriter, r *http.Request) {
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

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	from := time.Now().AddDate(0, -1, 0)
	to := time.Now()

	if fromStr != "" {
		if from, err = time.Parse(time.RFC3339, fromStr); err != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid from date", 400))
			return
		}
	}
	if toStr != "" {
		if to, err = time.Parse(time.RFC3339, toStr); err != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid to date", 400))
			return
		}
	}

	analytics, err := h.svc.GetContentAnalytics(r.Context(), contentID, from, to)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, analytics)
}

// GET /api/v1/workspaces/{workspaceId}/analytics/platform/{platform}
func (h *AnalyticsHandler) GetPlatformAnalytics(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	platformStr := chi.URLParam(r, "platform")
	if platformStr == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "platform is required", 400))
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 30
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}

	analytics, err := h.svc.GetPlatformAnalytics(r.Context(), member.WorkspaceID, domain.PlatformType(platformStr), limit)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, analytics)
}

// POST /api/v1/workspaces/{workspaceId}/analytics/sync
func (h *AnalyticsHandler) TriggerSync(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	if err := h.svc.TriggerSync(r.Context(), member.WorkspaceID); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusAccepted, map[string]string{"message": "sync queued"})
}
