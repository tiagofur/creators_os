-- AI Conversations

-- name: CreateConversation :one
INSERT INTO ai_conversations (workspace_id, user_id, title, mode, context_data)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, workspace_id, user_id, title, mode, context_data, created_at, updated_at, deleted_at;

-- name: GetConversation :one
SELECT id, workspace_id, user_id, title, mode, context_data, created_at, updated_at, deleted_at
FROM ai_conversations
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListConversations :many
SELECT id, workspace_id, user_id, title, mode, context_data, created_at, updated_at, deleted_at
FROM ai_conversations
WHERE workspace_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: DeleteConversation :exec
UPDATE ai_conversations
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- AI Messages

-- name: AddMessage :one
INSERT INTO ai_messages (conversation_id, role, content, tokens_used, model)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, conversation_id, role, content, tokens_used, model, created_at;

-- name: ListMessages :many
SELECT id, conversation_id, role, content, tokens_used, model, created_at
FROM ai_messages
WHERE conversation_id = $1
ORDER BY created_at ASC;

-- AI Credit Usage

-- name: RecordCreditUsage :exec
INSERT INTO ai_credit_usage (user_id, workspace_id, operation_type, tokens_used, credits_charged, model)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetCreditUsageSummary :one
SELECT COALESCE(SUM(credits_charged), 0)::INTEGER
FROM ai_credit_usage
WHERE user_id = $1 AND created_at >= $2;
