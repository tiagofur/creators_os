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

// SponsorshipHandler handles all sponsorship CRM HTTP endpoints.
type SponsorshipHandler struct {
	svc service.SponsorshipService
}

// NewSponsorshipHandler creates a new SponsorshipHandler.
func NewSponsorshipHandler(svc service.SponsorshipService) *SponsorshipHandler {
	return &SponsorshipHandler{svc: svc}
}

// ---- Request types ----

type createSponsorshipRequest struct {
	BrandName    string                   `json:"brand_name"`
	ContactName  *string                  `json:"contact_name"`
	ContactEmail *string                  `json:"contact_email"`
	Status       domain.SponsorshipStatus `json:"status"`
	DealValue    *float64                 `json:"deal_value"`
	Currency     string                   `json:"currency"`
	Notes        *string                  `json:"notes"`
	StartDate    *time.Time               `json:"start_date"`
	EndDate      *time.Time               `json:"end_date"`
}

type addMessageRequest struct {
	Content string `json:"content"`
}

// POST /api/v1/workspaces/{workspaceId}/sponsorships
func (h *SponsorshipHandler) Create(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createSponsorshipRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	sp := &domain.Sponsorship{
		BrandName:    req.BrandName,
		ContactName:  req.ContactName,
		ContactEmail: req.ContactEmail,
		Status:       req.Status,
		DealValue:    req.DealValue,
		Currency:     req.Currency,
		Notes:        req.Notes,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
	}

	created, err := h.svc.Create(r.Context(), member.WorkspaceID, sp)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, created)
}

// GET /api/v1/workspaces/{workspaceId}/sponsorships
func (h *SponsorshipHandler) List(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	filter := domain.SponsorshipFilter{Limit: 50}

	if s := r.URL.Query().Get("status"); s != "" {
		status := domain.SponsorshipStatus(s)
		filter.Status = &status
	}
	if f := r.URL.Query().Get("from"); f != "" {
		t, err := time.Parse(time.RFC3339, f)
		if err != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid from date", 400))
			return
		}
		filter.From = &t
	}
	if f := r.URL.Query().Get("to"); f != "" {
		t, err := time.Parse(time.RFC3339, f)
		if err != nil {
			JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid to date", 400))
			return
		}
		filter.To = &t
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			filter.Limit = n
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			filter.Offset = n
		}
	}

	sponsorships, err := h.svc.List(r.Context(), member.WorkspaceID, filter)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, sponsorships)
}

// GET /api/v1/workspaces/{workspaceId}/sponsorships/{id}
func (h *SponsorshipHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid sponsorship id", 400))
		return
	}

	sp, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, sp)
}

// PUT /api/v1/workspaces/{workspaceId}/sponsorships/{id}
func (h *SponsorshipHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid sponsorship id", 400))
		return
	}

	var req createSponsorshipRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	sp := &domain.Sponsorship{
		ID:           id,
		BrandName:    req.BrandName,
		ContactName:  req.ContactName,
		ContactEmail: req.ContactEmail,
		Status:       req.Status,
		DealValue:    req.DealValue,
		Currency:     req.Currency,
		Notes:        req.Notes,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
	}

	updated, err := h.svc.Update(r.Context(), sp)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, updated)
}

// DELETE /api/v1/workspaces/{workspaceId}/sponsorships/{id}
func (h *SponsorshipHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid sponsorship id", 400))
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/workspaces/{workspaceId}/sponsorships/{id}/messages
func (h *SponsorshipHandler) AddMessage(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	sponsorshipID, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid sponsorship id", 400))
		return
	}

	var req addMessageRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Content == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "content is required", 400))
		return
	}

	msg := &domain.SponsorshipMessage{
		SponsorshipID: sponsorshipID,
		UserID:        claims.UserID,
		Content:       req.Content,
	}

	created, err := h.svc.AddMessage(r.Context(), msg)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, created)
}

// GET /api/v1/workspaces/{workspaceId}/sponsorships/{id}/messages
func (h *SponsorshipHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	sponsorshipID, err := uuid.Parse(idStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid sponsorship id", 400))
		return
	}

	msgs, err := h.svc.ListMessages(r.Context(), sponsorshipID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, msgs)
}
