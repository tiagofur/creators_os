package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/ordo/creators-os/internal/service"
)

// AIHandler handles all AI Studio HTTP endpoints.
type AIHandler struct {
	aiService service.AIService
	aiRepo    repository.AIRepository
	userRepo  repository.UserRepository
}

// NewAIHandler creates a new AIHandler with the required dependencies.
func NewAIHandler(aiService service.AIService, aiRepo repository.AIRepository, userRepo repository.UserRepository) *AIHandler {
	return &AIHandler{
		aiService: aiService,
		aiRepo:    aiRepo,
		userRepo:  userRepo,
	}
}

// ---- Request / Response types ----

type createConversationRequest struct {
	Title *string `json:"title"`
	Mode  string  `json:"mode"`
}

type sendMessageRequest struct {
	Content string `json:"content"`
}

type brainstormRequest struct {
	Topic string `json:"topic"`
}

type generateScriptRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type scriptDoctorRequest struct {
	ScriptText string `json:"script_text"`
}

type atomizeRequest struct {
	ContentID string `json:"content_id"`
}

// ---- Handlers ----

// CreateConversation POST /api/v1/workspaces/{workspaceId}/ai/conversations
func (h *AIHandler) CreateConversation(w http.ResponseWriter, r *http.Request) {
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

	var req createConversationRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	mode := req.Mode
	if mode == "" {
		mode = "chat"
	}

	conv := &domain.AIConversation{
		WorkspaceID: workspaceID,
		UserID:      claims.UserID,
		Title:       req.Title,
		Mode:        mode,
		ContextData: make(map[string]any),
	}

	created, err := h.aiRepo.CreateConversation(r.Context(), conv)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusCreated, created)
}

// ListConversations GET /api/v1/workspaces/{workspaceId}/ai/conversations
func (h *AIHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
	workspaceIDStr := chi.URLParam(r, "workspaceId")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid workspaceId", 400))
		return
	}

	convs, err := h.aiRepo.ListConversations(r.Context(), workspaceID, 50, 0)
	if err != nil {
		Error(w, err)
		return
	}

	if convs == nil {
		convs = []*domain.AIConversation{}
	}
	JSON(w, http.StatusOK, convs)
}

// GetConversation GET /api/v1/workspaces/{workspaceId}/ai/conversations/{convId}
func (h *AIHandler) GetConversation(w http.ResponseWriter, r *http.Request) {
	convIDStr := chi.URLParam(r, "convId")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid convId", 400))
		return
	}

	conv, err := h.aiRepo.GetConversation(r.Context(), convID)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, conv)
}

// DeleteConversation DELETE /api/v1/workspaces/{workspaceId}/ai/conversations/{convId}
func (h *AIHandler) DeleteConversation(w http.ResponseWriter, r *http.Request) {
	convIDStr := chi.URLParam(r, "convId")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid convId", 400))
		return
	}

	if err := h.aiRepo.DeleteConversation(r.Context(), convID); err != nil {
		Error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SendMessage POST /api/v1/workspaces/{workspaceId}/ai/conversations/{convId}/messages
// Streams the AI response as SSE.
func (h *AIHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	convIDStr := chi.URLParam(r, "convId")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid convId", 400))
		return
	}

	var req sendMessageRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.Content == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "content is required", 400))
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	if err := h.aiService.SendMessage(r.Context(), convID, claims.UserID, req.Content, w); err != nil {
		// Can't change status code after WriteHeader, log and write error event
		_, _ = w.Write([]byte("data: {\"error\":\"" + err.Error() + "\"}\n\n"))
		return
	}

	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

// Brainstorm POST /api/v1/workspaces/{workspaceId}/ai/brainstorm
func (h *AIHandler) Brainstorm(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req brainstormRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.Topic == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "topic is required", 400))
		return
	}

	result, err := h.aiService.Brainstorm(r.Context(), claims.UserID, req.Topic)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]string{"result": result})
}

// GenerateScript POST /api/v1/workspaces/{workspaceId}/ai/script-generate
func (h *AIHandler) GenerateScript(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req generateScriptRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.Title == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "title is required", 400))
		return
	}

	result, err := h.aiService.GenerateScript(r.Context(), claims.UserID, req.Title, req.Description)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]string{"script": result})
}

// AnalyzeScript POST /api/v1/workspaces/{workspaceId}/ai/script-doctor
func (h *AIHandler) AnalyzeScript(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req scriptDoctorRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.ScriptText == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "script_text is required", 400))
		return
	}

	suggestions, err := h.aiService.AnalyzeScript(r.Context(), claims.UserID, req.ScriptText)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]any{"suggestions": suggestions})
}

// Atomize POST /api/v1/workspaces/{workspaceId}/ai/atomize
func (h *AIHandler) Atomize(w http.ResponseWriter, r *http.Request) {
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

	var req atomizeRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	if req.ContentID == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "content_id is required", 400))
		return
	}

	contentID, err := uuid.Parse(req.ContentID)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid content_id", 400))
		return
	}

	result, err := h.aiService.Atomize(r.Context(), claims.UserID, workspaceID, contentID)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, result)
}

// GetCreditBalance GET /api/v1/users/me/ai/credits
func (h *AIHandler) GetCreditBalance(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	balance, err := h.aiService.GetCreditBalance(r.Context(), claims.UserID)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]int{"balance": balance})
}
