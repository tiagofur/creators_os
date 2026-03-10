package ws

import (
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// writeWait is the time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// pongWait is the time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// pingPeriod is how often to ping the peer. Must be less than pongWait.
	pingPeriod = 30 * time.Second

	// maxMessageSize is the maximum size in bytes allowed from a peer.
	maxMessageSize = 512
)

// Client represents a single WebSocket connection to a specific workspace.
type Client struct {
	Hub         *Hub
	Conn        *websocket.Conn
	Send        chan []byte
	WorkspaceID uuid.UUID
	UserID      uuid.UUID
}

// ReadPump reads messages from the WebSocket connection and pumps them to the hub.
// Handles pong messages and deregisters the client on disconnect.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		slog.Error("ws: set read deadline", "err", err)
		return
	}
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Warn("ws: unexpected close", "err", err, "user_id", c.UserID)
			}
			break
		}
		// Clients are receive-only in this version; incoming messages are discarded.
	}
}

// WritePump pumps messages from the Send channel to the WebSocket connection.
// It sends a ping every pingPeriod and closes on pong timeout (60 s).
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}
			if !ok {
				// Hub closed the channel.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := w.Write(message); err != nil {
				return
			}
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
