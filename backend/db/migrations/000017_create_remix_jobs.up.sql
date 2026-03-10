CREATE TABLE remix_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, ingesting, transcribing, scoring, generating, complete, failed
    input_url TEXT NOT NULL,
    results JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_remix_jobs_workspace ON remix_jobs(workspace_id);
CREATE INDEX idx_remix_jobs_user ON remix_jobs(user_id);
