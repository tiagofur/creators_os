package handler

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/ordo/creators-os/internal/auth"
	"github.com/ordo/creators-os/internal/domain"
	appws "github.com/ordo/creators-os/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// CORS is handled by the global middleware; allow all origins at the WS level.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// WSHandler upgrades HTTP connections to WebSocket and manages the lifecycle.
type WSHandler struct {
	hub        *appws.Hub
	jwtManager *auth.JWTManager
}

// NewWSHandler creates a new WSHandler.
func NewWSHandler(hub *appws.Hub, jwtManager *auth.JWTManager) *WSHandler {
	return &WSHandler{hub: hub, jwtManager: jwtManager}
}

// ServeHTTP handles GET /api/v1/ws
// Auth: JWT is extracted from the ?token= query param and validated BEFORE upgrading.
// On auth failure a 401 HTTP response is returned (before upgrade).
func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		JSON(w, http.StatusUnauthorized, domain.NewError("AUTH_002", "missing token query parameter", 401))
		return
	}

	claims, err := h.jwtManager.ValidateToken(tokenStr)
	if err != nil {
		JSON(w, http.StatusUnauthorized, domain.ErrUnauthorized)
		return
	}

	// Extract workspaceId query param (optional — defaults to zero UUID).
	workspaceID := uuid.Nil
	if wsIDStr := r.URL.Query().Get("workspace_id"); wsIDStr != "" {
		if id, parseErr := uuid.Parse(wsIDStr); parseErr == nil {
			workspaceID = id
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		// Upgrade itself writes a 4xx response on failure; nothing more to do.
		return
	}

	client := &appws.Client{
		Hub:         h.hub,
		Conn:        conn,
		Send:        make(chan []byte, 256),
		WorkspaceID: workspaceID,
		UserID:      claims.UserID,
	}

	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}
