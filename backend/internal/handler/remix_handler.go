package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// RemixHandler handles all Remix Engine HTTP endpoints.
type RemixHandler struct {
	remixService service.RemixService
}

// NewRemixHandler creates a new RemixHandler.
func NewRemixHandler(remixService service.RemixService) *RemixHandler {
	return &RemixHandler{remixService: remixService}
}

// ---- Request / Response types ----

type submitAnalysisRequest struct {
	InputURL string `json:"input_url"`
}

type applyResultsRequest struct {
	ClipIDs []string `json:"clip_ids"`
}

// ---- Handlers ----

// SubmitAnalysis POST /api/v1/workspaces/{workspaceId}/remix/analyze
func (h *RemixHandler) SubmitAnalysis(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	workspaceIDStr := chi.URLParam(r, "workspaceId")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid workspaceId", 400))
		return
	}

	var req submitAnalysisRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.InputURL == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "input_url is required", 400))
		return
	}

	job, err := h.remixService.SubmitAnalysis(r.Context(), workspaceID, claims.UserID, req.InputURL)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusAccepted, map[string]string{
		"job_id":     job.ID.String(),
		"status_url": "/api/v1/workspaces/" + workspaceIDStr + "/remix/" + job.ID.String() + "/status",
		"status":     job.Status,
	})
}

// GetJobStatus GET /api/v1/workspaces/{workspaceId}/remix/{jobId}/status
func (h *RemixHandler) GetJobStatus(w http.ResponseWriter, r *http.Request) {
	jobIDStr := chi.URLParam(r, "jobId")
	jobID, err := uuid.Parse(jobIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid jobId", 400))
		return
	}

	job, err := h.remixService.GetJobStatus(r.Context(), jobID)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, job)
}

// GetJobResults GET /api/v1/workspaces/{workspaceId}/remix/{jobId}/results
func (h *RemixHandler) GetJobResults(w http.ResponseWriter, r *http.Request) {
	jobIDStr := chi.URLParam(r, "jobId")
	jobID, err := uuid.Parse(jobIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid jobId", 400))
		return
	}

	results, err := h.remixService.GetJobResults(r.Context(), jobID)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, results)
}

// ApplyResults POST /api/v1/workspaces/{workspaceId}/remix/{jobId}/apply
func (h *RemixHandler) ApplyResults(w http.ResponseWriter, r *http.Request) {
	jobIDStr := chi.URLParam(r, "jobId")
	jobID, err := uuid.Parse(jobIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid jobId", 400))
		return
	}

	var req applyResultsRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	contents, err := h.remixService.ApplyResults(r.Context(), jobID, req.ClipIDs)
	if err != nil {
		Error(w, err)
		return
	}

	if contents == nil {
		contents = []*domain.Content{}
	}
	JSON(w, http.StatusCreated, contents)
}
