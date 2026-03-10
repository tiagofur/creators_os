package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/middleware"
)

// auditLogRow is the response shape for a single audit log entry.
type auditLogRow struct {
	ID          uuid.UUID      `json:"id"`
	WorkspaceID uuid.UUID      `json:"workspace_id"`
	UserID      *uuid.UUID     `json:"user_id,omitempty"`
	Action      string         `json:"action"`
	EntityType  string         `json:"entity_type"`
	EntityID    *uuid.UUID     `json:"entity_id,omitempty"`
	Metadata    map[string]any `json:"metadata"`
	CreatedAt   time.Time      `json:"created_at"`
}

// AuditHandler handles GET /api/v1/workspaces/{workspaceId}/audit-logs.
type AuditHandler struct {
	pool *pgxpool.Pool
}

// NewAuditHandler creates a new AuditHandler.
func NewAuditHandler(pool *pgxpool.Pool) *AuditHandler {
	return &AuditHandler{pool: pool}
}

// ListAuditLogs handles GET /api/v1/workspaces/{workspaceId}/audit-logs
// Owner/admin only. Accepts ?limit=25&offset=0.
func (h *AuditHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	member, ok := middleware.WorkspaceMemberFromContext(r.Context())
	if !ok {
		Error(w, domain.ErrUnauthorized)
		return
	}

	// Restrict to owner/admin.
	if member.Role != domain.RoleOwner && member.Role != domain.RoleAdmin {
		Error(w, domain.ErrForbidden)
		return
	}

	limit := 25
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if oStr := r.URL.Query().Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}

	const q = `
		SELECT id, workspace_id, user_id, action, entity_type, entity_id, metadata, created_at
		FROM activity_logs
		WHERE workspace_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := h.pool.Query(r.Context(), q, member.WorkspaceID, limit, offset)
	if err != nil {
		Error(w, err)
		return
	}
	defer rows.Close()

	var logs []*auditLogRow
	for rows.Next() {
		row := &auditLogRow{}
		var metadataRaw []byte
		if err := rows.Scan(
			&row.ID,
			&row.WorkspaceID,
			&row.UserID,
			&row.Action,
			&row.EntityType,
			&row.EntityID,
			&metadataRaw,
			&row.CreatedAt,
		); err != nil {
			Error(w, err)
			return
		}
		if len(metadataRaw) > 0 {
			_ = json.Unmarshal(metadataRaw, &row.Metadata)
		}
		if row.Metadata == nil {
			row.Metadata = map[string]any{}
		}
		logs = append(logs, row)
	}
	if err := rows.Err(); err != nil {
		Error(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"logs":   logs,
		"limit":  limit,
		"offset": offset,
	})
}
