package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// ContentTemplateHandler handles all content template HTTP endpoints.
type ContentTemplateHandler struct {
	templateSvc service.ContentTemplateService
}

// NewContentTemplateHandler creates a new ContentTemplateHandler.
func NewContentTemplateHandler(templateSvc service.ContentTemplateService) *ContentTemplateHandler {
	return &ContentTemplateHandler{templateSvc: templateSvc}
}

// ---- Request types ----

type createTemplateRequest struct {
	Name             string               `json:"name"`
	Description      *string              `json:"description"`
	ContentType      domain.ContentType   `json:"content_type"`
	PlatformTarget   *domain.PlatformType `json:"platform_target"`
	DefaultChecklist map[string]any       `json:"default_checklist"`
	PromptTemplate   *string              `json:"prompt_template"`
	Metadata         map[string]any       `json:"metadata"`
}

type updateTemplateRequest struct {
	Name             *string              `json:"name"`
	Description      *string              `json:"description"`
	ContentType      *domain.ContentType  `json:"content_type"`
	PlatformTarget   *domain.PlatformType `json:"platform_target"`
	DefaultChecklist map[string]any       `json:"default_checklist"`
	PromptTemplate   *string              `json:"prompt_template"`
	Metadata         map[string]any       `json:"metadata"`
}

type instantiateTemplateRequest struct {
	Topic string `json:"topic"`
	UseAI bool   `json:"use_ai"`
}

// ---- Handlers ----

// Create POST /api/v1/workspaces/{workspaceId}/templates
func (h *ContentTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createTemplateRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Name == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "name is required", 400))
		return
	}

	t, err := h.templateSvc.Create(r.Context(), member.WorkspaceID, req.Name, req.Description, req.ContentType, req.PlatformTarget, req.DefaultChecklist, req.PromptTemplate, req.Metadata)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, t)
}

// List GET /api/v1/workspaces/{workspaceId}/templates
func (h *ContentTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	templates, err := h.templateSvc.List(r.Context(), member.WorkspaceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, templates)
}

// Get GET /api/v1/workspaces/{workspaceId}/templates/{templateId}
func (h *ContentTemplateHandler) Get(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	templateIDStr := chi.URLParam(r, "templateId")
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid templateId", 400))
		return
	}

	t, err := h.templateSvc.GetByID(r.Context(), templateID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, t)
}

// Update PUT /api/v1/workspaces/{workspaceId}/templates/{templateId}
func (h *ContentTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	templateIDStr := chi.URLParam(r, "templateId")
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid templateId", 400))
		return
	}

	var req updateTemplateRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	t, err := h.templateSvc.Update(r.Context(), templateID, req.Name, req.Description, req.ContentType, req.PlatformTarget, req.DefaultChecklist, req.PromptTemplate, req.Metadata)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, t)
}

// Delete DELETE /api/v1/workspaces/{workspaceId}/templates/{templateId}
func (h *ContentTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	templateIDStr := chi.URLParam(r, "templateId")
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid templateId", 400))
		return
	}

	if err := h.templateSvc.Delete(r.Context(), templateID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Instantiate POST /api/v1/workspaces/{workspaceId}/templates/{templateId}/instantiate
func (h *ContentTemplateHandler) Instantiate(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	templateIDStr := chi.URLParam(r, "templateId")
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid templateId", 400))
		return
	}

	var req instantiateTemplateRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	content, err := h.templateSvc.Instantiate(r.Context(), templateID, member.WorkspaceID, member.UserID, req.Topic, req.UseAI)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, content)
}
