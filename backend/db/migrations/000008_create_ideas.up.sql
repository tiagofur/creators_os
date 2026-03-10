CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status idea_status NOT NULL DEFAULT 'draft',
    platform_target platform_type,
    promoted_to_content_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_ideas_workspace_status ON ideas(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ideas_workspace_created ON ideas(workspace_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_ideas_created_by ON ideas(created_by) WHERE deleted_at IS NULL;
