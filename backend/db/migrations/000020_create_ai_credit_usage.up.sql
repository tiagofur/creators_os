CREATE TABLE ai_credit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    operation_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER NOT NULL,
    credits_charged INTEGER NOT NULL,
    model VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_credit_usage_user ON ai_credit_usage(user_id, created_at DESC);
CREATE INDEX idx_ai_credit_usage_workspace ON ai_credit_usage(workspace_id, created_at DESC);
