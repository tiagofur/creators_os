package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/metrics"
)

// pgAIRepository implements AIRepository using pgx/v5 directly.
type pgAIRepository struct {
	pool *pgxpool.Pool
}

// NewAIRepository creates a new AIRepository backed by the provided pool.
func NewAIRepository(pool *pgxpool.Pool) AIRepository {
	return &pgAIRepository{pool: pool}
}

// scanConversation reads all ai_conversations columns into a domain.AIConversation.
func scanConversation(row pgx.Row) (*domain.AIConversation, error) {
	c := &domain.AIConversation{}
	var contextJSON []byte
	err := row.Scan(
		&c.ID,
		&c.WorkspaceID,
		&c.UserID,
		&c.Title,
		&c.Mode,
		&contextJSON,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if contextJSON != nil {
		if err := json.Unmarshal(contextJSON, &c.ContextData); err != nil {
			return nil, err
		}
	}
	if c.ContextData == nil {
		c.ContextData = make(map[string]any)
	}
	return c, nil
}

// CreateConversation inserts a new AI conversation.
func (r *pgAIRepository) CreateConversation(ctx context.Context, conv *domain.AIConversation) (*domain.AIConversation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_conversations.create").Observe(time.Since(start).Seconds())
	}()

	contextJSON, err := json.Marshal(conv.ContextData)
	if err != nil {
		return nil, err
	}

	const q = `
		INSERT INTO ai_conversations (workspace_id, user_id, title, mode, context_data)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, workspace_id, user_id, title, mode, context_data, created_at, updated_at, deleted_at`

	row := r.pool.QueryRow(ctx, q,
		conv.WorkspaceID,
		conv.UserID,
		conv.Title,
		conv.Mode,
		contextJSON,
	)
	return scanConversation(row)
}

// GetConversation returns a single non-deleted conversation by ID.
func (r *pgAIRepository) GetConversation(ctx context.Context, id uuid.UUID) (*domain.AIConversation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_conversations.get").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, user_id, title, mode, context_data, created_at, updated_at, deleted_at
		FROM ai_conversations WHERE id = $1 AND deleted_at IS NULL`

	row := r.pool.QueryRow(ctx, q, id)
	return scanConversation(row)
}

// ListConversations returns paginated non-deleted conversations for a workspace.
func (r *pgAIRepository) ListConversations(ctx context.Context, workspaceID uuid.UUID, limit, offset int) ([]*domain.AIConversation, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_conversations.list").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, workspace_id, user_id, title, mode, context_data, created_at, updated_at, deleted_at
		FROM ai_conversations
		WHERE workspace_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.pool.Query(ctx, q, workspaceID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.AIConversation
	for rows.Next() {
		conv, err := scanConversation(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, conv)
	}
	return result, rows.Err()
}

// DeleteConversation soft-deletes an AI conversation.
func (r *pgAIRepository) DeleteConversation(ctx context.Context, id uuid.UUID) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_conversations.delete").Observe(time.Since(start).Seconds())
	}()

	const q = `UPDATE ai_conversations SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.pool.Exec(ctx, q, id)
	return err
}

// scanMessage reads all ai_messages columns into a domain.AIMessage.
func scanMessage(row pgx.Row) (*domain.AIMessage, error) {
	m := &domain.AIMessage{}
	err := row.Scan(
		&m.ID,
		&m.ConversationID,
		&m.Role,
		&m.Content,
		&m.TokensUsed,
		&m.Model,
		&m.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return m, nil
}

// AddMessage inserts a new message into a conversation.
func (r *pgAIRepository) AddMessage(ctx context.Context, msg *domain.AIMessage) (*domain.AIMessage, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_messages.add").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO ai_messages (conversation_id, role, content, tokens_used, model)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, conversation_id, role, content, tokens_used, model, created_at`

	row := r.pool.QueryRow(ctx, q,
		msg.ConversationID,
		msg.Role,
		msg.Content,
		msg.TokensUsed,
		msg.Model,
	)
	return scanMessage(row)
}

// ListMessages returns all messages for a conversation ordered by created_at ASC.
func (r *pgAIRepository) ListMessages(ctx context.Context, conversationID uuid.UUID) ([]*domain.AIMessage, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_messages.list").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT id, conversation_id, role, content, tokens_used, model, created_at
		FROM ai_messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC`

	rows, err := r.pool.Query(ctx, q, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.AIMessage
	for rows.Next() {
		msg, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, msg)
	}
	return result, rows.Err()
}

// RecordCreditUsage inserts a credit usage record.
func (r *pgAIRepository) RecordCreditUsage(ctx context.Context, usage *domain.AICreditUsage) error {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_credit_usage.record").Observe(time.Since(start).Seconds())
	}()

	const q = `
		INSERT INTO ai_credit_usage (user_id, workspace_id, operation_type, tokens_used, credits_charged, model)
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.pool.Exec(ctx, q,
		usage.UserID,
		usage.WorkspaceID,
		usage.OperationType,
		usage.TokensUsed,
		usage.CreditsCharged,
		usage.Model,
	)
	return err
}

// GetCreditUsageSummary returns the total credits charged for a user since the given time.
func (r *pgAIRepository) GetCreditUsageSummary(ctx context.Context, userID uuid.UUID, since time.Time) (int, error) {
	start := time.Now()
	defer func() {
		metrics.DBQueryDuration.WithLabelValues("ai_credit_usage.summary").Observe(time.Since(start).Seconds())
	}()

	const q = `
		SELECT COALESCE(SUM(credits_charged), 0)
		FROM ai_credit_usage
		WHERE user_id = $1 AND created_at >= $2`

	var total int
	err := r.pool.QueryRow(ctx, q, userID, since).Scan(&total)
	if err != nil {
		return 0, err
	}
	return total, nil
}
