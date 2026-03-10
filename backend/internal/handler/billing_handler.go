package handler

import (
	"io"
	"net/http"

	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
	"github.com/ordo/creators-os/internal/service"
)

// BillingHandler handles Stripe billing HTTP endpoints.
type BillingHandler struct {
	svc service.BillingService
}

// NewBillingHandler creates a new BillingHandler.
func NewBillingHandler(svc service.BillingService) *BillingHandler {
	return &BillingHandler{svc: svc}
}

// ---- Request types ----

type createCheckoutRequest struct {
	PriceID string `json:"price_id"`
}

// POST /api/v1/billing/checkout
func (h *BillingHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	var req createCheckoutRequest
	if err := Decode(r, &req); err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "invalid request body", 400))
		return
	}
	if req.PriceID == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("VALIDATION", "price_id is required", 400))
		return
	}

	url, err := h.svc.CreateCheckoutSession(r.Context(), claims.UserID, req.PriceID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"url": url})
}

// POST /api/v1/billing/portal
func (h *BillingHandler) CreatePortalSession(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.UserClaimsFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	url, err := h.svc.CreatePortalSession(r.Context(), claims.UserID)
	if err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"url": url})
}

// POST /webhooks/stripe
// IMPORTANT: reads raw body — no JSON middleware that pre-reads the body.
func (h *BillingHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	const maxWebhookBytes = 65536 // 64 KB

	body, err := io.ReadAll(io.LimitReader(r.Body, maxWebhookBytes))
	if err != nil {
		JSON(w, http.StatusBadRequest, domain.NewError("BILLING_003", "failed to read request body", 400))
		return
	}
	defer r.Body.Close()

	signature := r.Header.Get("Stripe-Signature")
	if signature == "" {
		JSON(w, http.StatusBadRequest, domain.NewError("BILLING_004", "missing Stripe-Signature header", 400))
		return
	}

	if err := h.svc.HandleWebhook(r.Context(), body, signature); err != nil {
		Error(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
