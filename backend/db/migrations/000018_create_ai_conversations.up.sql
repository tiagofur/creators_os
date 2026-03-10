CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500),
    mode VARCHAR(50) NOT NULL DEFAULT 'chat',
    context_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_ai_conversations_workspace ON ai_conversations(workspace_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id) WHERE deleted_at IS NULL;
