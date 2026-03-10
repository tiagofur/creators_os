-- name: CreateSeries :one
INSERT INTO series (workspace_id, created_by, title, description, platform, template)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at;

-- name: GetSeriesByID :one
SELECT id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at
FROM series
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListSeries :many
SELECT id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at
FROM series
WHERE workspace_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateSeries :one
UPDATE series
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    platform = COALESCE($4, platform),
    template = COALESCE($5, template),
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, workspace_id, created_by, title, description, platform, template, created_at, updated_at, deleted_at;

-- name: SoftDeleteSeries :exec
UPDATE series SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL;

-- name: AddSeriesEpisode :one
INSERT INTO series_episodes (series_id, content_id, episode_number, title, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, series_id, content_id, episode_number, title, status, created_at, updated_at;

-- name: GetSeriesEpisode :one
SELECT id, series_id, content_id, episode_number, title, status, created_at, updated_at
FROM series_episodes WHERE id = $1;

-- name: ListSeriesEpisodes :many
SELECT id, series_id, content_id, episode_number, title, status, created_at, updated_at
FROM series_episodes WHERE series_id = $1
ORDER BY episode_number ASC;

-- name: UpdateSeriesEpisode :one
UPDATE series_episodes
SET title = COALESCE($2, title),
    status = COALESCE($3, status),
    content_id = COALESCE($4, content_id),
    updated_at = NOW()
WHERE id = $1
RETURNING id, series_id, content_id, episode_number, title, status, created_at, updated_at;

-- name: DeleteSeriesEpisode :exec
DELETE FROM series_episodes WHERE id = $1;

-- name: UpsertSeriesSchedule :one
INSERT INTO series_publishing_schedule (series_id, frequency, day_of_week, time_of_day, timezone, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (series_id) DO UPDATE
SET frequency = EXCLUDED.frequency,
    day_of_week = EXCLUDED.day_of_week,
    time_of_day = EXCLUDED.time_of_day,
    timezone = EXCLUDED.timezone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
RETURNING id, series_id, frequency, day_of_week, time_of_day, timezone, is_active, created_at, updated_at;

-- name: GetSeriesSchedule :one
SELECT id, series_id, frequency, day_of_week, time_of_day, timezone, is_active, created_at, updated_at
FROM series_publishing_schedule WHERE series_id = $1;
