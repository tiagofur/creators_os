CREATE TABLE activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,  -- e.g. "content.created", "idea.deleted"
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE activity_logs_2026_03 PARTITION OF activity_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX activity_logs_workspace_created_at_idx
    ON activity_logs_2026_03(workspace_id, created_at DESC);
