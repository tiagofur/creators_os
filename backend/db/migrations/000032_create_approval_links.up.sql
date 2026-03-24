CREATE TABLE approval_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    reviewer_name VARCHAR(255),
    reviewer_email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    comment TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_approval_links_token ON approval_links(token);
CREATE INDEX idx_approval_links_content ON approval_links(content_id);
