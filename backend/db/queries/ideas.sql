-- name: CreateIdea :one
INSERT INTO ideas (workspace_id, created_by, title, description, status, platform_target, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, workspace_id, created_by, title, description, status, platform_target, promoted_to_content_id, metadata, created_at, updated_at, deleted_at;

-- name: GetIdeaByID :one
SELECT id, workspace_id, created_by, title, description, status, platform_target, promoted_to_content_id, metadata, created_at, updated_at, deleted_at
FROM ideas
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListIdeas :many
SELECT id, workspace_id, created_by, title, description, status, platform_target, promoted_to_content_id, metadata, created_at, updated_at, deleted_at
FROM ideas
WHERE workspace_id = $1
  AND deleted_at IS NULL
  AND ($2::idea_status IS NULL OR status = $2)
  AND ($3::uuid IS NULL OR created_by = $3)
  AND ($4::platform_type IS NULL OR platform_target = $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: UpdateIdea :one
UPDATE ideas
SET title = $2, description = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, workspace_id, created_by, title, description, status, platform_target, promoted_to_content_id, metadata, created_at, updated_at, deleted_at;

-- name: SoftDeleteIdea :exec
UPDATE ideas SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL;

-- name: UpdateIdeaStatus :exec
UPDATE ideas SET status = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL;

-- name: PromoteIdea :exec
UPDATE ideas SET status = 'promoted', promoted_to_content_id = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL;

-- name: UpsertIdeaValidationScore :one
INSERT INTO idea_validation_scores (idea_id, novelty_score, audience_fit_score, viability_score, urgency_score, personal_fit_score, overall_score, ai_reasoning)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (idea_id) DO UPDATE
SET novelty_score = EXCLUDED.novelty_score,
    audience_fit_score = EXCLUDED.audience_fit_score,
    viability_score = EXCLUDED.viability_score,
    urgency_score = EXCLUDED.urgency_score,
    personal_fit_score = EXCLUDED.personal_fit_score,
    overall_score = EXCLUDED.overall_score,
    ai_reasoning = EXCLUDED.ai_reasoning,
    updated_at = NOW()
RETURNING id, idea_id, novelty_score, audience_fit_score, viability_score, urgency_score, personal_fit_score, overall_score, ai_reasoning, created_at, updated_at;

-- name: GetIdeaValidationScore :one
SELECT id, idea_id, novelty_score, audience_fit_score, viability_score, urgency_score, personal_fit_score, overall_score, ai_reasoning, created_at, updated_at
FROM idea_validation_scores WHERE idea_id = $1;

-- name: DeleteIdeaTags :exec
DELETE FROM idea_tags WHERE idea_id = $1;

-- name: InsertIdeaTag :exec
INSERT INTO idea_tags (idea_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: ListIdeaTags :many
SELECT tag FROM idea_tags WHERE idea_id = $1 ORDER BY tag;
