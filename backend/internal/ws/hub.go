package ws

import (
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
)

// broadcastMsg bundles an event with its target workspace.
type broadcastMsg struct {
	workspaceID uuid.UUID
	event       Event
}

// Hub maintains the set of active WebSocket clients and broadcasts events to them.
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan broadcastMsg
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// NewHub creates and initialises a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan broadcastMsg, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's event loop. Call this in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			data, err := json.Marshal(msg.event)
			if err != nil {
				slog.Error("ws: marshal event", "err", err)
				continue
			}

			h.mu.RLock()
			for client := range h.clients {
				if client.WorkspaceID != msg.workspaceID {
					continue
				}
				select {
				case client.Send <- data:
				default:
					// Slow client — drop message and schedule removal.
					go func(c *Client) { h.unregister <- c }(client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends an event to all clients connected to the given workspace.
func (h *Hub) Broadcast(workspaceID uuid.UUID, event Event) {
	h.broadcast <- broadcastMsg{workspaceID: workspaceID, event: event}
}

// Register adds a client to the hub.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}
