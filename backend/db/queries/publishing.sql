-- Publishing queries (documented; implemented manually in repository/publishing_repository.go)

-- name: SaveCredential :one
-- INSERT INTO platform_credentials (...) VALUES (...) ON CONFLICT (workspace_id, platform) DO UPDATE SET ...
-- RETURNING id, workspace_id, platform, channel_id, channel_name,
--           encrypted_access_token, encrypted_refresh_token, scopes,
--           token_expires_at, created_at, updated_at;

-- name: GetCredential :one
-- SELECT * FROM platform_credentials WHERE workspace_id = $1 AND platform = $2;

-- name: ListCredentials :many
-- SELECT * FROM platform_credentials WHERE workspace_id = $1 ORDER BY created_at ASC;

-- name: DeleteCredential :exec
-- DELETE FROM platform_credentials WHERE id = $1;

-- name: CreateScheduledPost :one
-- INSERT INTO scheduled_posts (workspace_id, content_id, credential_id, platform, status, scheduled_at)
-- VALUES ($1, $2, $3, $4, $5, $6)
-- RETURNING *;

-- name: GetScheduledPost :one
-- SELECT * FROM scheduled_posts WHERE id = $1;

-- name: ListScheduledPosts :many
-- SELECT * FROM scheduled_posts
-- WHERE workspace_id = $1 AND scheduled_at >= $2 AND scheduled_at <= $3
-- ORDER BY scheduled_at ASC;

-- name: GetDuePosts :many
-- SELECT * FROM scheduled_posts WHERE status = 'pending' AND scheduled_at <= $1 ORDER BY scheduled_at ASC;

-- name: UpdatePostStatus :exec
-- UPDATE scheduled_posts
-- SET status = $2, platform_post_id = $3, error_message = $4,
--     published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END,
--     updated_at = NOW()
-- WHERE id = $1;
