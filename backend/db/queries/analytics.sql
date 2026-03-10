-- Analytics queries (documented; implemented manually in repository/analytics_repository.go)

-- name: SavePlatformAnalytics :exec
-- INSERT INTO platform_analytics (workspace_id, platform, followers_count, total_views, total_engagement, recorded_at)
-- VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetOverview :many
-- SELECT DISTINCT ON (platform)
--     id, workspace_id, platform, followers_count, total_views, total_engagement, recorded_at
-- FROM platform_analytics
-- WHERE workspace_id = $1
-- ORDER BY platform, recorded_at DESC;

-- name: GetPlatformAnalytics :many
-- SELECT id, workspace_id, platform, followers_count, total_views, total_engagement, recorded_at
-- FROM platform_analytics
-- WHERE workspace_id = $1 AND platform = $2
-- ORDER BY recorded_at DESC
-- LIMIT $3;
