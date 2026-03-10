package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// AuthHandler handles all authentication HTTP endpoints.
type AuthHandler struct {
	authService  service.AuthService
	jwtManager   *auth.JWTManager
	oauthManager *auth.OAuthManager
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService service.AuthService, jwtManager *auth.JWTManager, oauthManager *auth.OAuthManager) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		jwtManager:   jwtManager,
		oauthManager: oauthManager,
	}
}

// ---- Request / Response types ----

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// ---- Handlers ----

// Register POST /api/v1/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		JSON(w, http.StatusBadRequest, map[string]any{
			"code":    "VALIDATION",
			"message": "email, password, and full_name are required",
		})
		return
	}

	tokens, err := h.authService.Register(r.Context(), req.Email, req.Password, req.FullName)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusCreated, tokens)
}

// Login POST /api/v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Email == "" || req.Password == "" {
		JSON(w, http.StatusBadRequest, map[string]any{
			"code":    "VALIDATION",
			"message": "email and password are required",
		})
		return
	}

	tokens, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, tokens)
}

// Refresh POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.RefreshToken == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "refresh_token is required", 400))
		return
	}

	tokens, err := h.authService.RefreshTokens(r.Context(), req.RefreshToken)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, tokens)
}

// Logout POST /api/v1/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req logoutRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.RefreshToken == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "refresh_token is required", 400))
		return
	}

	if err := h.authService.Logout(r.Context(), req.RefreshToken); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// LogoutAll POST /api/v1/auth/logout-all
func (h *AuthHandler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	if err := h.authService.LogoutAll(r.Context(), claims.UserID); err != nil {
		Error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ForgotPassword POST /api/v1/auth/forgot-password
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}

	// Always return 200 — no enumeration
	_ = h.authService.ForgotPassword(r.Context(), req.Email)
	JSON(w, http.StatusOK, map[string]string{"message": "if that email exists, a reset link was sent"})
}

// ResetPassword POST /api/v1/auth/reset-password
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "token and new_password are required", 400))
		return
	}

	if err := h.authService.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"message": "password updated successfully"})
}

// VerifyEmail GET /api/v1/auth/verify-email?token=...
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "token query parameter is required", 400))
		return
	}

	if err := h.authService.VerifyEmail(r.Context(), token); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"message": "email verified successfully"})
}

// OAuthRedirect GET /api/v1/auth/oauth/{provider}
func (h *AuthHandler) OAuthRedirect(w http.ResponseWriter, r *http.Request) {
	provider := r.PathValue("provider")
	if provider == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "provider is required", 400))
		return
	}

	state, err := generateOAuthState()
	if err != nil {
		Error(w, domain.NewError("INTERNAL", "failed to generate state", 500))
		return
	}

	if err := h.oauthManager.StoreState(r.Context(), state); err != nil {
		Error(w, domain.NewError("INTERNAL", "failed to store oauth state", 500))
		return
	}

	url, err := h.oauthManager.GetAuthURL(provider, state)
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "unknown oauth provider", 400))
		return
	}

	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// OAuthCallback GET /api/v1/auth/oauth/{provider}/callback
func (h *AuthHandler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	provider := r.PathValue("provider")
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "code and state are required", 400))
		return
	}

	tokens, err := h.authService.OAuthLogin(r.Context(), provider, code, state)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, tokens)
}

// generateOAuthState creates a secure random state string (16 bytes as hex).
func generateOAuthState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
