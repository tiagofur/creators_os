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

// ApprovalHandler handles all approval link HTTP endpoints.
type ApprovalHandler struct {
	approvalSvc service.ApprovalService
}

// NewApprovalHandler creates a new ApprovalHandler.
func NewApprovalHandler(approvalSvc service.ApprovalService) *ApprovalHandler {
	return &ApprovalHandler{approvalSvc: approvalSvc}
}

// ---- Request types ----

type createApprovalLinkRequest struct {
	ReviewerName  string `json:"reviewer_name"`
	ReviewerEmail string `json:"reviewer_email"`
	ExpiresInHours int   `json:"expires_in_hours"`
}

// ---- Authenticated Handlers ----

// CreateLink POST /workspaces/{workspaceId}/contents/{contentId}/approval-links
func (h *ApprovalHandler) CreateLink(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
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

	var req createApprovalLinkRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	expiresIn := 7 * 24 * time.Hour // default 7 days
	if req.ExpiresInHours > 0 {
		expiresIn = time.Duration(req.ExpiresInHours) * time.Hour
	}

	link, err := h.approvalSvc.CreateApprovalLink(r.Context(), contentID, member.WorkspaceID, req.ReviewerName, req.ReviewerEmail, expiresIn)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, link)
}

// ListLinks GET /workspaces/{workspaceId}/contents/{contentId}/approval-links
func (h *ApprovalHandler) ListLinks(w http.ResponseWriter, r *http.Request) {
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

	links, err := h.approvalSvc.ListApprovalLinks(r.Context(), contentID)
	if err != nil {
		Error(w, err)
		return
	}
	if links == nil {
		links = []*domain.ApprovalLink{}
	}
	JSON(w, http.StatusOK, links)
}

// ---- Public Handlers (no auth) ----

// GetReview GET /api/v1/review/{token}
func (h *ApprovalHandler) GetReview(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "token is required", 400))
		return
	}

	link, content, err := h.approvalSvc.GetApprovalByToken(r.Context(), token)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"approval_link": link,
		"content":       content,
	})
}

// SubmitDecision POST /api/v1/review/{token}/decision
func (h *ApprovalHandler) SubmitDecision(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "token is required", 400))
		return
	}

	var decision domain.ApprovalDecision
	if err := Decode(r, &decision); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if err := h.approvalSvc.SubmitDecision(r.Context(), token, decision); err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "decision recorded"})
}
