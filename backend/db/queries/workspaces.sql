-- name: CreateWorkspace :one
INSERT INTO workspaces (owner_id, name, slug, description, avatar_url, settings)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, owner_id, name, slug, description, avatar_url, settings, created_at, updated_at, deleted_at;

-- name: GetWorkspaceByID :one
SELECT id, owner_id, name, slug, description, avatar_url, settings, created_at, updated_at, deleted_at
FROM workspaces
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetWorkspaceBySlug :one
SELECT id, owner_id, name, slug, description, avatar_url, settings, created_at, updated_at, deleted_at
FROM workspaces
WHERE slug = $1 AND deleted_at IS NULL;

-- name: ListWorkspacesByUserID :many
SELECT w.id, w.owner_id, w.name, w.slug, w.description, w.avatar_url, w.settings,
       w.created_at, w.updated_at, w.deleted_at
FROM workspaces w
INNER JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = $1 AND w.deleted_at IS NULL
ORDER BY w.created_at DESC;

-- name: UpdateWorkspace :one
UPDATE workspaces
SET name = COALESCE($2, name),
    description = COALESCE($3, description),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, owner_id, name, slug, description, avatar_url, settings, created_at, updated_at, deleted_at;

-- name: SoftDeleteWorkspace :exec
UPDATE workspaces
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetWorkspaceMember :one
SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
       u.email AS user_email, u.full_name AS user_name
FROM workspace_members wm
INNER JOIN users u ON wm.user_id = u.id
WHERE wm.workspace_id = $1 AND wm.user_id = $2;

-- name: ListWorkspaceMembers :many
SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at,
       u.email AS user_email, u.full_name AS user_name
FROM workspace_members wm
INNER JOIN users u ON wm.user_id = u.id
WHERE wm.workspace_id = $1
ORDER BY wm.joined_at ASC;

-- name: AddWorkspaceMember :one
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ($1, $2, $3)
RETURNING id, workspace_id, user_id, role, joined_at;

-- name: UpdateMemberRole :exec
UPDATE workspace_members
SET role = $3
WHERE workspace_id = $1 AND user_id = $2;

-- name: RemoveWorkspaceMember :exec
DELETE FROM workspace_members
WHERE workspace_id = $1 AND user_id = $2;

-- name: CountWorkspaceMembers :one
SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1;

-- name: CountWorkspacesByOwner :one
SELECT COUNT(*) FROM workspaces WHERE owner_id = $1 AND deleted_at IS NULL;

-- name: CreateInvitation :one
INSERT INTO workspace_invitations (workspace_id, invited_by, email, role, token, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at;

-- name: GetInvitationByToken :one
SELECT id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at
FROM workspace_invitations
WHERE token = $1;

-- name: ListInvitations :many
SELECT id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at
FROM workspace_invitations
WHERE workspace_id = $1
ORDER BY created_at DESC;

-- name: AcceptInvitation :one
UPDATE workspace_invitations
SET accepted_at = NOW()
WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
RETURNING id, workspace_id, invited_by, email, role, token, accepted_at, expires_at, created_at;

-- name: DeleteInvitation :exec
DELETE FROM workspace_invitations WHERE id = $1;
