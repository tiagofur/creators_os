package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/storage"
)

// UploadHandler handles presigned upload and download endpoints.
type UploadHandler struct {
	storageClient storage.StorageClient
}

// NewUploadHandler creates a new UploadHandler.
func NewUploadHandler(storageClient storage.StorageClient) *UploadHandler {
	return &UploadHandler{storageClient: storageClient}
}

// allowedMIMETypes lists the MIME types that may be uploaded.
var allowedMIMETypes = map[string]string{
	"video/mp4":       "video",
	"video/quicktime": "video",
	"video/webm":      "video",
	"image/jpeg":      "image",
	"image/png":       "image",
	"image/webp":      "image",
}

// presignRequest is the body for the presign endpoint.
type presignRequest struct {
	ContentType string `json:"content_type"`
	FileExt     string `json:"file_extension"`
	WorkspaceID string `json:"workspace_id"`
}

// presignResponse is the response from the presign endpoint.
type presignResponse struct {
	UploadURL string    `json:"upload_url"`
	ObjectKey string    `json:"object_key"`
	ExpiresAt time.Time `json:"expires_at"`
}

// confirmRequest is the body for the confirm endpoint.
type confirmRequest struct {
	ObjectKey string `json:"object_key"`
}

// downloadResponse is the response from the download endpoint.
type downloadResponse struct {
	DownloadURL string `json:"download_url"`
}

// Presign POST /api/v1/uploads/presign
func (h *UploadHandler) Presign(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req presignRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	category, allowed := allowedMIMETypes[req.ContentType]
	if !allowed {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "unsupported content type", 400))
		return
	}
	if req.WorkspaceID == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "workspace_id is required", 400))
		return
	}

	ext := strings.TrimPrefix(req.FileExt, ".")
	if ext == "" {
		ext = "bin"
	}

	objectKey := req.WorkspaceID + "/" + category + "/" + uuid.NewString() + "." + ext

	expiry := 15 * time.Minute
	uploadURL, err := h.storageClient.PresignPutURL(r.Context(), objectKey, expiry)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, presignResponse{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
		ExpiresAt: time.Now().Add(expiry),
	})
}

// Confirm POST /api/v1/uploads/confirm
func (h *UploadHandler) Confirm(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req confirmRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.ObjectKey == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "object_key is required", 400))
		return
	}

	if _, err := h.storageClient.HeadObject(r.Context(), req.ObjectKey); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("UPLOAD_001", "object not found in storage", 400))
		return
	}

	JSON(w, http.StatusOK, map[string]string{"message": "upload confirmed"})
}

// Download GET /api/v1/uploads/{objectKey}
func (h *UploadHandler) Download(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	objectKey := chi.URLParam(r, "objectKey")
	if objectKey == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "objectKey is required", 400))
		return
	}

	downloadURL, err := h.storageClient.PresignGetURL(r.Context(), objectKey, 15*time.Minute)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, downloadResponse{DownloadURL: downloadURL})
}
