package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// SeriesHandler handles all series HTTP endpoints.
type SeriesHandler struct {
	seriesSvc service.SeriesService
}

// NewSeriesHandler creates a new SeriesHandler.
func NewSeriesHandler(seriesSvc service.SeriesService) *SeriesHandler {
	return &SeriesHandler{seriesSvc: seriesSvc}
}

// ---- Request types ----

type createSeriesRequest struct {
	Title       string               `json:"title"`
	Description *string              `json:"description"`
	Platform    *domain.PlatformType `json:"platform"`
}

type updateSeriesRequest struct {
	Title       *string              `json:"title"`
	Description *string              `json:"description"`
	Platform    *domain.PlatformType `json:"platform"`
}

type addEpisodeRequest struct {
	ContentID     *string `json:"content_id"`
	EpisodeNumber int     `json:"episode_number"`
	Title         string  `json:"title"`
}

type updateEpisodeRequest struct {
	Title     *string               `json:"title"`
	Status    *domain.ContentStatus `json:"status"`
	ContentID *string               `json:"content_id"`
}

type upsertScheduleRequest struct {
	Frequency  string `json:"frequency"`
	DayOfWeek  *int   `json:"day_of_week"`
	TimeOfDay  string `json:"time_of_day"`
	Timezone   string `json:"timezone"`
	IsActive   *bool  `json:"is_active"`
}

// ---- Handlers ----

// Create POST /api/v1/workspaces/{workspaceId}/series
func (h *SeriesHandler) Create(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createSeriesRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Title == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "title is required", 400))
		return
	}

	series, err := h.seriesSvc.Create(r.Context(), member.WorkspaceID, member.UserID, req.Title, req.Description, req.Platform)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, series)
}

// List GET /api/v1/workspaces/{workspaceId}/series
func (h *SeriesHandler) List(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	series, err := h.seriesSvc.List(r.Context(), member.WorkspaceID, 50, 0)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, series)
}

// Get GET /api/v1/workspaces/{workspaceId}/series/{seriesId}
func (h *SeriesHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	seriesIDStr := chi.URLParam(r, "seriesId")
	seriesID, err := uuid.Parse(seriesIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid seriesId", 400))
		return
	}

	series, err := h.seriesSvc.GetByID(r.Context(), seriesID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, series)
}

// Update PUT /api/v1/workspaces/{workspaceId}/series/{seriesId}
func (h *SeriesHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	seriesIDStr := chi.URLParam(r, "seriesId")
	seriesID, err := uuid.Parse(seriesIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid seriesId", 400))
		return
	}

	var req updateSeriesRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	series, err := h.seriesSvc.Update(r.Context(), seriesID, req.Title, req.Description, req.Platform)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, series)
}

// Delete DELETE /api/v1/workspaces/{workspaceId}/series/{seriesId}
func (h *SeriesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	seriesIDStr := chi.URLParam(r, "seriesId")
	seriesID, err := uuid.Parse(seriesIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid seriesId", 400))
		return
	}

	if err := h.seriesSvc.Delete(r.Context(), seriesID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AddEpisode POST /api/v1/workspaces/{workspaceId}/series/{seriesId}/episodes
func (h *SeriesHandler) AddEpisode(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	seriesIDStr := chi.URLParam(r, "seriesId")
	seriesID, err := uuid.Parse(seriesIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid seriesId", 400))
		return
	}

	var req addEpisodeRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Title == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "title is required", 400))
		return
	}

	var contentID *uuid.UUID
	if req.ContentID != nil && *req.ContentID != "" {
		cid, err := uuid.Parse(*req.ContentID)
		if err != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid content_id", 400))
			return
		}
		contentID = &cid
	}

	ep, err := h.seriesSvc.AddEpisode(r.Context(), seriesID, contentID, req.EpisodeNumber, req.Title)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, ep)
}

// UpdateEpisode PUT /api/v1/workspaces/{workspaceId}/series/{seriesId}/episodes/{epId}
func (h *SeriesHandler) UpdateEpisode(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	epIDStr := chi.URLParam(r, "epId")
	epID, err := uuid.Parse(epIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid epId", 400))
		return
	}

	var req updateEpisodeRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	var contentID *uuid.UUID
	if req.ContentID != nil && *req.ContentID != "" {
		cid, err := uuid.Parse(*req.ContentID)
		if err != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid content_id", 400))
			return
		}
		contentID = &cid
	}

	ep, err := h.seriesSvc.UpdateEpisode(r.Context(), epID, req.Title, req.Status, contentID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, ep)
}

// DeleteEpisode DELETE /api/v1/workspaces/{workspaceId}/series/{seriesId}/episodes/{epId}
func (h *SeriesHandler) DeleteEpisode(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	epIDStr := chi.URLParam(r, "epId")
	epID, err := uuid.Parse(epIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid epId", 400))
		return
	}

	if err := h.seriesSvc.DeleteEpisode(r.Context(), epID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// UpsertSchedule PUT /api/v1/workspaces/{workspaceId}/series/{seriesId}/schedule
func (h *SeriesHandler) UpsertSchedule(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	seriesIDStr := chi.URLParam(r, "seriesId")
	seriesID, err := uuid.Parse(seriesIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid seriesId", 400))
		return
	}

	var req upsertScheduleRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Frequency == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "frequency is required", 400))
		return
	}
	if req.TimeOfDay == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "time_of_day is required", 400))
		return
	}

	timezone := req.Timezone
	if timezone == "" {
		timezone = "UTC"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	schedule := &domain.SeriesPublishingSchedule{
		SeriesID:  seriesID,
		Frequency: req.Frequency,
		DayOfWeek: req.DayOfWeek,
		TimeOfDay: req.TimeOfDay,
		Timezone:  timezone,
		IsActive:  isActive,
	}

	result, err := h.seriesSvc.UpsertSchedule(r.Context(), schedule)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, result)
}
