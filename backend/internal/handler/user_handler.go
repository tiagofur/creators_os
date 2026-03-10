package handler

import (
	"net/http"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/repository"
)

// UserHandler handles user profile endpoints.
type UserHandler struct {
	userRepo repository.UserRepository
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(userRepo repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

type updateMeRequest struct {
	FullName  string  `json:"full_name"`
	AvatarURL *string `json:"avatar_url"`
}

// GetMe GET /api/v1/users/me
func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, user)
}

// UpdateMe PUT /api/v1/users/me
func (h *UserHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req updateMeRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	user := &domain.User{
		ID:        claims.UserID,
		FullName:  req.FullName,
		AvatarURL: req.AvatarURL,
	}

	updated, err := h.userRepo.Update(r.Context(), user)
	if err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, updated)
}
