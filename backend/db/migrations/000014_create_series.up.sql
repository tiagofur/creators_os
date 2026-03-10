CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    platform platform_type,
    template JSONB NOT NULL DEFAULT '{}',
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_series_workspace ON series(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_series_search_vector_gin ON series USING GIN (search_vector);
