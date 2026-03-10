CREATE TABLE platform_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    followers_count BIGINT NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    total_engagement BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_platform_analytics_workspace ON platform_analytics(workspace_id, recorded_at DESC);
CREATE INDEX idx_platform_analytics_platform ON platform_analytics(platform, recorded_at DESC);
