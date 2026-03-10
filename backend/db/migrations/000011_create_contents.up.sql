CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status content_status NOT NULL DEFAULT 'idea',
    content_type VARCHAR(50) NOT NULL DEFAULT 'video',
    platform_target platform_type,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_contents_workspace_status ON contents(workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_workspace_created ON contents(workspace_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_due_date ON contents(workspace_id, due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
CREATE INDEX idx_contents_metadata_gin ON contents USING GIN (metadata);
CREATE INDEX idx_contents_search_vector_gin ON contents USING GIN (search_vector);
