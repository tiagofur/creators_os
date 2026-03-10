-- name: CreateContent :one
INSERT INTO contents (workspace_id, created_by, title, description, status, content_type, platform_target, scheduled_at, published_at, due_date, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id, workspace_id, created_by, title, description, status, content_type, platform_target, scheduled_at, published_at, due_date, metadata, created_at, updated_at, deleted_at;

-- name: GetContentByID :one
SELECT id, workspace_id, created_by, title, description, status, content_type, platform_target, scheduled_at, published_at, due_date, metadata, created_at, updated_at, deleted_at
FROM contents
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListContents :many
-- Dynamic filter: statuses array, optional assigned_to join, optional platform filter
SELECT c.id, c.workspace_id, c.created_by, c.title, c.description, c.status, c.content_type, c.platform_target, c.scheduled_at, c.published_at, c.due_date, c.metadata, c.created_at, c.updated_at, c.deleted_at
FROM contents c
WHERE c.workspace_id = $1
  AND c.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateContent :one
UPDATE contents
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    platform_target = COALESCE($4, platform_target),
    due_date = COALESCE($5, due_date),
    scheduled_at = COALESCE($6, scheduled_at),
    metadata = COALESCE($7, metadata),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, workspace_id, created_by, title, description, status, content_type, platform_target, scheduled_at, published_at, due_date, metadata, created_at, updated_at, deleted_at;

-- name: UpdateContentStatus :exec
UPDATE contents SET status = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL;

-- name: SoftDeleteContent :exec
UPDATE contents SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL;

-- name: AddContentAssignment :one
INSERT INTO content_assignments (content_id, user_id, role)
VALUES ($1, $2, $3)
RETURNING id, content_id, user_id, role, assigned_at;

-- name: RemoveContentAssignment :exec
DELETE FROM content_assignments WHERE content_id = $1 AND user_id = $2;

-- name: ListContentAssignments :many
SELECT id, content_id, user_id, role, assigned_at
FROM content_assignments WHERE content_id = $1
ORDER BY assigned_at ASC;
