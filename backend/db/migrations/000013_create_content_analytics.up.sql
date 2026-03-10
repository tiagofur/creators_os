CREATE TABLE content_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    platform platform_type NOT NULL,
    views BIGINT NOT NULL DEFAULT 0,
    likes BIGINT NOT NULL DEFAULT 0,
    comments BIGINT NOT NULL DEFAULT 0,
    shares BIGINT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create first partition (current month)
CREATE TABLE content_analytics_2026_03 PARTITION OF content_analytics
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE INDEX idx_content_analytics_2026_03_content ON content_analytics_2026_03(content_id, recorded_at DESC);
