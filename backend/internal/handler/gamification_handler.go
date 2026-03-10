package handler

import (
	"net/http"
	"strconv"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// GamificationHandler handles all gamification HTTP endpoints.
type GamificationHandler struct {
	svc service.GamificationService
}

// NewGamificationHandler creates a new GamificationHandler.
func NewGamificationHandler(svc service.GamificationService) *GamificationHandler {
	return &GamificationHandler{svc: svc}
}

// GET /api/v1/workspaces/{workspaceId}/gamification/leaderboard
func (h *GamificationHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}

	leaderboard, err := h.svc.GetLeaderboard(r.Context(), member.WorkspaceID, limit)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, leaderboard)
}

// GET /api/v1/workspaces/{workspaceId}/gamification/my-stats
func (h *GamificationHandler) GetMyStats(w http.ResponseWriter, r *http.Request) {
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

	stats, err := h.svc.GetMyStats(r.Context(), claims.UserID, member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, stats)
}

// GET /api/v1/workspaces/{workspaceId}/gamification/achievements
func (h *GamificationHandler) ListAchievements(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	achievements, err := h.svc.ListAchievements(r.Context())
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, achievements)
}
