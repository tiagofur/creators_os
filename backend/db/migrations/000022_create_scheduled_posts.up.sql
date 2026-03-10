CREATE TABLE scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES contents(id),
    credential_id UUID REFERENCES platform_credentials(id),
    platform platform_type NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, publishing, published, failed
    scheduled_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    platform_post_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scheduled_posts_status_scheduled ON scheduled_posts(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_scheduled_posts_workspace ON scheduled_posts(workspace_id);
CREATE INDEX idx_scheduled_posts_content ON scheduled_posts(content_id);
